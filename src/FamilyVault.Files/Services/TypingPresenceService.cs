using System.Collections.Concurrent;

namespace FamilyVault.Files.Services;

/// <summary>
/// Tracks live typing indicators in memory only so typing heartbeats never wake or query Azure SQL Serverless.
/// </summary>
public sealed class TypingPresenceService(TimeProvider time)
{
    public static readonly TimeSpan TypingTtl = TimeSpan.FromSeconds(4);

    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, string>> _participants = new();
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, (string Name, DateTimeOffset ExpiresAt)>> _typing = new();

    public void CacheParticipants(Guid conversationId, IEnumerable<(Guid UserId, string ShownName)> participants)
    {
        var map = new ConcurrentDictionary<Guid, string>();
        foreach (var (userId, name) in participants)
        {
            if (userId != Guid.Empty && !string.IsNullOrWhiteSpace(name))
            {
                map[userId] = name;
            }
        }

        _participants[conversationId] = map;
    }

    public bool RecordTyping(Guid conversationId, Guid userId)
    {
        if (!_participants.TryGetValue(conversationId, out var members)
            || !members.TryGetValue(userId, out var shownName))
        {
            return false;
        }

        var active = _typing.GetOrAdd(conversationId, _ => new ConcurrentDictionary<Guid, (string, DateTimeOffset)>());
        active[userId] = (shownName, time.GetUtcNow().Add(TypingTtl));
        return true;
    }

    public void ClearTyping(Guid conversationId, Guid userId)
    {
        if (_typing.TryGetValue(conversationId, out var active))
        {
            active.TryRemove(userId, out _);
        }
    }

    public IReadOnlyList<string> GetTypingNames(Guid conversationId, Guid viewerUserId)
    {
        if (!_typing.TryGetValue(conversationId, out var active) || active.IsEmpty)
        {
            return [];
        }

        var now = time.GetUtcNow();
        var names = new List<string>();
        foreach (var entry in active)
        {
            if (entry.Value.ExpiresAt <= now)
            {
                active.TryRemove(entry.Key, out _);
                continue;
            }

            if (entry.Key != viewerUserId)
            {
                names.Add(entry.Value.Name);
            }
        }

        names.Sort(StringComparer.OrdinalIgnoreCase);
        return names;
    }
}
