using FamilyVault.Files.Contracts;
using FamilyVault.Files.Data;
using FamilyVault.Files.Data.Entities;
using FamilyVault.Files.Security;
using Microsoft.EntityFrameworkCore;

namespace FamilyVault.Files.Services;

public sealed class GameCustomLevelService(ApplicationDbContext db, TimeProvider time)
{
    public const int DefaultListLimit = 60;

    public async Task<IReadOnlyList<GameCustomLevelSummaryView>> ListLevelsAsync(
        Guid currentUserId,
        string gameKey,
        int limit = DefaultListLimit,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var clampedLimit = Math.Clamp(limit, 1, 100);

        // Sort in memory because SQLite cannot ORDER BY DateTimeOffset.
        var rows = await db.GameCustomLevels.AsNoTracking()
            .Where(x => x.GameKey == key)
            .ToListAsync(cancellationToken)
            .ConfigureAwait(false);

        rows.Sort((a, b) => b.UpdatedAt.CompareTo(a.UpdatedAt));
        var pageRows = rows.Take(clampedLimit).ToList();

        var (members, flairs) = await LoadMemberLookupsAsync(pageRows, cancellationToken).ConfigureAwait(false);

        var result = new List<GameCustomLevelSummaryView>(pageRows.Count);
        foreach (var row in pageRows)
        {
            result.Add(ToSummaryView(row, currentUserId, members, flairs, badgeUrlResolver));
        }

        return result;
    }

    public async Task<GameCustomLevelDetailView> GetLevelAsync(
        Guid currentUserId,
        string gameKey,
        Guid levelId,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var row = await db.GameCustomLevels.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == levelId && x.GameKey == key, cancellationToken)
            .ConfigureAwait(false);

        if (row is null)
        {
            throw new VaultNotFoundException();
        }

        var (members, flairs) = await LoadMemberLookupsAsync([row], cancellationToken).ConfigureAwait(false);
        var summary = ToSummaryView(row, currentUserId, members, flairs, badgeUrlResolver);
        return new GameCustomLevelDetailView(summary, row.LevelJson);
    }

    public async Task<GameCustomLevelDetailView> SaveLevelAsync(
        Guid userId,
        string gameKey,
        Guid? levelId,
        SaveGameCustomLevelInput input,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
        {
            throw new GameScoreValidationException("Sign in to publish a level.");
        }

        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var title = GameLevelRules.ValidateTitle(input.Title);
        var description = GameLevelRules.ValidateDescription(input.Description);
        var normalizedJson = GameLevelRules.ValidateAndNormalizeLevelJson(key, input.LevelJson);
        var now = time.GetUtcNow();

        await EnsureMemberExistsAsync(userId, now, cancellationToken).ConfigureAwait(false);

        GameCustomLevelEntity row;
        if (levelId is null || levelId == Guid.Empty)
        {
            var myCount = await db.GameCustomLevels
                .CountAsync(x => x.GameKey == key && x.AuthorUserId == userId, cancellationToken)
                .ConfigureAwait(false);

            if (myCount >= GameLevelRules.MaxLevelsPerUser)
            {
                throw new GameScoreValidationException($"You can publish up to {GameLevelRules.MaxLevelsPerUser} levels. Delete or edit an existing level first.");
            }

            row = new GameCustomLevelEntity
            {
                Id = Guid.NewGuid(),
                GameKey = key,
                AuthorUserId = userId,
                Title = title,
                Description = description,
                LevelJson = normalizedJson,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.GameCustomLevels.Add(row);
        }
        else
        {
            var existing = await db.GameCustomLevels
                .FirstOrDefaultAsync(x => x.Id == levelId.Value && x.GameKey == key, cancellationToken)
                .ConfigureAwait(false);

            if (existing is null)
            {
                throw new VaultNotFoundException();
            }

            if (existing.AuthorUserId != userId)
            {
                throw new GameScoreValidationException("You can only edit levels you created. Use Remix to save your own copy!");
            }

            existing.Title = title;
            existing.Description = description;
            existing.LevelJson = normalizedJson;
            existing.UpdatedAt = now;
            row = existing;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var (members, flairs) = await LoadMemberLookupsAsync([row], cancellationToken).ConfigureAwait(false);
        return new GameCustomLevelDetailView(
            ToSummaryView(row, userId, members, flairs, badgeUrlResolver),
            row.LevelJson);
    }

    public async Task DeleteLevelAsync(
        Guid userId,
        bool isAdmin,
        string gameKey,
        Guid levelId,
        CancellationToken cancellationToken = default)
    {
        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var row = await db.GameCustomLevels
            .FirstOrDefaultAsync(x => x.Id == levelId && x.GameKey == key, cancellationToken)
            .ConfigureAwait(false);

        if (row is null)
        {
            throw new VaultNotFoundException();
        }

        if (row.AuthorUserId != userId && !isAdmin)
        {
            throw new GameScoreValidationException("You can only delete levels you created.");
        }

        db.GameCustomLevels.Remove(row);
        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<RecordCustomLevelRunView> RecordRunAsync(
        Guid userId,
        string gameKey,
        Guid levelId,
        bool completed,
        int score,
        int elapsedMs,
        Func<string?, string?>? badgeUrlResolver = null,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
        {
            throw new GameScoreValidationException("Sign in to record a run.");
        }

        var key = GameScoreRules.NormalizeGameKey(gameKey);
        var (validScore, _) = GameScoreRules.ValidateScore(score, 0);
        var clampedMs = Math.Clamp(elapsedMs, 500, 3_600_000);
        var now = time.GetUtcNow();

        await EnsureMemberExistsAsync(userId, now, cancellationToken).ConfigureAwait(false);

        var row = await db.GameCustomLevels
            .FirstOrDefaultAsync(x => x.Id == levelId && x.GameKey == key, cancellationToken)
            .ConfigureAwait(false);

        if (row is null)
        {
            throw new VaultNotFoundException();
        }

        row.PlaysCount += 1;
        var isNewRecord = false;

        if (completed)
        {
            row.ClearsCount += 1;
            if (validScore > row.BestScore ||
                (validScore == row.BestScore && validScore > 0 && (row.BestTimeMs is null || clampedMs < row.BestTimeMs.Value)))
            {
                isNewRecord = true;
                row.BestScore = validScore;
                row.BestTimeMs = clampedMs;
                row.RecordHolderUserId = userId;
            }
            else if (row.BestTimeMs is null)
            {
                row.BestTimeMs = clampedMs;
                if (row.RecordHolderUserId is null)
                {
                    row.RecordHolderUserId = userId;
                }
            }
        }
        else if (row.ClearsCount == 0 && validScore > row.BestScore)
        {
            isNewRecord = true;
            row.BestScore = validScore;
            row.RecordHolderUserId = userId;
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);

        var (members, flairs) = await LoadMemberLookupsAsync([row], cancellationToken).ConfigureAwait(false);
        return new RecordCustomLevelRunView(
            isNewRecord,
            ToSummaryView(row, userId, members, flairs, badgeUrlResolver));
    }

    private async Task EnsureMemberExistsAsync(Guid userId, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var exists = await db.FamilyMembers
            .AnyAsync(m => m.UserId == userId, cancellationToken)
            .ConfigureAwait(false);

        if (!exists)
        {
            db.FamilyMembers.Add(new FamilyMemberEntity
            {
                UserId = userId,
                DisplayName = MemberLabel.FallbackName,
                FirstSeenAt = now,
                LastSeenAt = now
            });
        }
    }

    private async Task<(Dictionary<Guid, FamilyMemberEntity> Members, Dictionary<Guid, UserPersonalizationEntity> Flairs)>
        LoadMemberLookupsAsync(IReadOnlyCollection<GameCustomLevelEntity> rows, CancellationToken cancellationToken)
    {
        var userIds = new HashSet<Guid>();
        foreach (var r in rows)
        {
            userIds.Add(r.AuthorUserId);
            if (r.RecordHolderUserId is { } recId)
            {
                userIds.Add(recId);
            }
        }

        if (userIds.Count == 0)
        {
            return ([], []);
        }

        var idList = userIds.ToList();
        var members = await db.FamilyMembers.AsNoTracking()
            .Where(m => idList.Contains(m.UserId))
            .ToDictionaryAsync(m => m.UserId, cancellationToken)
            .ConfigureAwait(false);

        var flairs = await db.UserPersonalizations.AsNoTracking()
            .Where(p => idList.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, cancellationToken)
            .ConfigureAwait(false);

        return (members, flairs);
    }

    private static GameCustomLevelSummaryView ToSummaryView(
        GameCustomLevelEntity row,
        Guid currentUserId,
        IReadOnlyDictionary<Guid, FamilyMemberEntity> members,
        IReadOnlyDictionary<Guid, UserPersonalizationEntity> flairs,
        Func<string?, string?>? badgeUrlResolver)
    {
        members.TryGetValue(row.AuthorUserId, out var author);
        flairs.TryGetValue(row.AuthorUserId, out var authorFlair);

        var authorName = MemberLabel.Shown(author?.DisplayName, author?.Email);
        var authorColor = NormalizeColor(author?.AccentColor);
        var authorTag = string.IsNullOrWhiteSpace(authorFlair?.StatusTag) ? null : authorFlair.StatusTag;
        var headerBadge = string.IsNullOrWhiteSpace(authorFlair?.HeaderBadge) || authorFlair.HeaderBadge == "none"
            ? null
            : authorFlair.HeaderBadge;
        var badgeUrl = badgeUrlResolver is not null ? badgeUrlResolver(headerBadge) : null;

        string? recordHolderName = null;
        string? recordHolderColor = null;
        if (row.RecordHolderUserId is { } recId)
        {
            members.TryGetValue(recId, out var recMember);
            recordHolderName = MemberLabel.Shown(recMember?.DisplayName, recMember?.Email);
            recordHolderColor = NormalizeColor(recMember?.AccentColor);
        }

        return new GameCustomLevelSummaryView(
            row.Id,
            row.GameKey,
            row.Title,
            row.Description,
            row.AuthorUserId,
            authorName,
            authorColor,
            authorTag,
            badgeUrl,
            row.PlaysCount,
            row.ClearsCount,
            row.BestScore,
            row.BestTimeMs,
            recordHolderName,
            recordHolderColor,
            row.CreatedAt,
            row.UpdatedAt,
            row.AuthorUserId == currentUserId);
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
