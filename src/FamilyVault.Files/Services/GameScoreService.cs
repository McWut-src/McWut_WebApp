using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class GameScoreService(ApplicationDbContext db, TimeProvider time)
{
    public const int DefaultLeaderboardLimit = 25;

    public async Task<GameLeaderboardView> GetLeaderboardAsync(
        Guid currentUserId,
        string gameKey,
        int limit = DefaultLeaderboardLimit,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var clampedLimit = Math.Clamp(limit, 1, 100);

        // Load all rows for this gameKey; sort in memory because SQLite cannot ORDER BY DateTimeOffset.
        var rows = await db.GameScores.AsNoTracking()
            .Where(x => x.GameKey == key)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        var totalGamesPlayed = rows.Sum(x => x.GamesPlayed);
        var scoredRows = rows.Where(x => x.BestScore > 0).ToList();

        scoredRows.Sort((left, right) =>
        {
            var cmp = right.BestScore.CompareTo(left.BestScore);
            if (cmp != 0)
            {
                return cmp;
            }

            cmp = right.BestCombo.CompareTo(left.BestCombo);
            if (cmp != 0)
            {
                return cmp;
            }

            return left.AchievedAt.CompareTo(right.AchievedAt);
        });

        var userIds = rows.Select(x => x.UserId).Distinct().ToList();
        var members = new Dictionary<Guid, FamilyMemberEntity>();
        var flairs = new Dictionary<Guid, UserPersonalizationEntity>();

        if (userIds.Count > 0)
        {
            members = await db.FamilyMembers.AsNoTracking()
                .Where(m => userIds.Contains(m.UserId))
                .ToDictionaryAsync(m => m.UserId, cancellationToken)
                .ConfigureAwait(false);

            flairs = await db.UserPersonalizations.AsNoTracking()
                .Where(p => userIds.Contains(p.UserId))
                .ToDictionaryAsync(p => p.UserId, cancellationToken)
                .ConfigureAwait(false);
        }

        var ranked = new List<GameLeaderboardEntryView>(scoredRows.Count);
        GameLeaderboardEntryView? myRecord = null;

        for (var i = 0; i < scoredRows.Count; i++)
        {
            var row = scoredRows[i];
            var rank = i + 1;
            var entry = ToEntryView(row, rank, currentUserId, members, flairs, badgeUrlResolver);
            ranked.Add(entry);
            if (row.UserId == currentUserId)
            {
                myRecord = entry;
            }
        }

        var topEntries = ranked.Take(clampedLimit).ToList();
        return new GameLeaderboardView(
            key,
            scoredRows.Count,
            totalGamesPlayed,
            myRecord,
            topEntries);
    }

    public async Task<GameScoreSubmissionView> SubmitScoreAsync(
        Guid userId,
        string gameKey,
        int score,
        int maxCombo,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
        {
            throw new GameScoreValidationException("Sign in to submit a score.");
        }

        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var (validScore, validCombo) = GameScoreRules.ValidateScore(score, maxCombo);
        var now = time.GetUtcNow();

        var memberExists = await db.FamilyMembers
            .AnyAsync(m => m.UserId == userId, cancellationToken)
            .ConfigureAwait(false);
        if (!memberExists)
        {
            db.FamilyMembers.Add(new FamilyMemberEntity
            {
                UserId = userId,
                DisplayName = MemberLabel.FallbackName,
                FirstSeenAt = now,
                LastSeenAt = now
            });
        }

        var row = await db.GameScores
            .FirstOrDefaultAsync(x => x.GameKey == key && x.UserId == userId, cancellationToken)
            .ConfigureAwait(false);

        var isNewBest = false;
        if (row is null)
        {
            isNewBest = validScore > 0;
            row = new GameScoreEntity
            {
                Id = Guid.NewGuid(),
                GameKey = key,
                UserId = userId,
                BestScore = validScore,
                BestCombo = validCombo,
                GamesPlayed = 1,
                AchievedAt = now,
                LastPlayedAt = now
            };
            db.GameScores.Add(row);
        }
        else
        {
            row.GamesPlayed += 1;
            row.LastPlayedAt = now;
            if (validScore > row.BestScore)
            {
                isNewBest = true;
                row.BestScore = validScore;
                row.BestCombo = Math.Max(row.BestCombo, validCombo);
                row.AchievedAt = now;
            }
            else if (validScore == row.BestScore && validCombo > row.BestCombo)
            {
                row.BestCombo = validCombo;
            }
            else if (validCombo > row.BestCombo)
            {
                row.BestCombo = validCombo;
            }
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var leaderboard = await GetLeaderboardAsync(
            userId,
            key,
            DefaultLeaderboardLimit,
            badgeUrlResolver,
            cancellationToken).ConfigureAwait(false);

        return new GameScoreSubmissionView(
            isNewBest,
            validScore,
            validCombo,
            row.BestScore,
            row.BestCombo,
            leaderboard.MyRecord?.Rank,
            leaderboard);
    }

    private static GameLeaderboardEntryView ToEntryView(
        GameScoreEntity row,
        int rank,
        Guid currentUserId,
        IReadOnlyDictionary<Guid, FamilyMemberEntity> members,
        IReadOnlyDictionary<Guid, UserPersonalizationEntity> flairs,
        Func<string?, string?>? badgeUrlResolver)
    {
        members.TryGetValue(row.UserId, out var member);
        flairs.TryGetValue(row.UserId, out var flair);

        var shownName = MemberLabel.Shown(member?.DisplayName, member?.Email);
        var color = NormalizeColor(member?.AccentColor);
        var statusTag = string.IsNullOrWhiteSpace(flair?.StatusTag) ? null : flair.StatusTag;
        var headerBadge = string.IsNullOrWhiteSpace(flair?.HeaderBadge) || flair.HeaderBadge == "none"
            ? null
            : flair.HeaderBadge;
        var badgeUrl = badgeUrlResolver is not null ? badgeUrlResolver(headerBadge) : null;

        return new GameLeaderboardEntryView(
            rank,
            row.UserId,
            shownName,
            color,
            statusTag,
            headerBadge,
            badgeUrl,
            row.BestScore,
            row.BestCombo,
            row.GamesPlayed,
            row.AchievedAt,
            row.UserId == currentUserId);
    }

    private static string NormalizeColor(string? color)
    {
        var raw = (color ?? "").Trim();
        if (raw.Length == 7 && raw[0] == '#')
        {
            return raw.ToLowerInvariant();
        }

        return MemberLabel.DarkInk;
    }
}
