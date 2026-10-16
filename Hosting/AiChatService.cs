using System.Runtime.CompilerServices;
using System.Text;
using FamilyVault.Files.Contracts;
using FamilyVault.Files.Security;
using Microsoft.Extensions.Caching.Memory;

namespace McWutWebApp.Hosting;

public sealed record SavedChat(Guid Id, string Title, string FileName);

public sealed record PreparedChat(string Model, IReadOnlyList<OpenRouterTurn> Messages);

public sealed class AiChatService(
    OpenRouterKeyService keys,
    OpenRouterClient openRouter,
    IMemoryCache cache,
    IUploadSessionService uploads)
{
    public Task<OpenRouterKeyStatus> GetStatusAsync(Guid userId, CancellationToken cancellationToken) =>
        keys.GetStatusAsync(userId, cancellationToken);

    public async Task<OpenRouterKeyStatus> SaveAsync(Guid userId, string? key, CancellationToken cancellationToken)
    {
        var clean = OpenRouterRules.NormalizeKey(key);
        await openRouter.EnsureKeyAsync(clean, cancellationToken);
        var status = await keys.SaveAsync(userId, clean, cancellationToken);
        cache.Remove(ModelsCacheKey(userId, includePaid: false));
        cache.Remove(ModelsCacheKey(userId, includePaid: true));
        return status;
    }

    public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken)
    {
        await keys.DeleteAsync(userId, cancellationToken);
        cache.Remove(ModelsCacheKey(userId, includePaid: false));
        cache.Remove(ModelsCacheKey(userId, includePaid: true));
    }

    public Task<IReadOnlyList<OpenRouterListedModel>> ListModelsAsync(Guid userId, bool includePaid, CancellationToken cancellationToken) =>
        LoadModelsAsync(userId, includePaid, refresh: false, cancellationToken);

    public async Task<PreparedChat> PrepareChatAsync(
        Guid userId,
        string? model,
        IReadOnlyList<OpenRouterTurnInput>? messages,
        bool markdown,
        bool includePaid,
        CancellationToken cancellationToken)
    {
        var chat = OpenRouterRules.NormalizeChat(model, messages);
        var models = await LoadModelsAsync(userId, includePaid, refresh: false, cancellationToken);
        if (!models.Any(item => item.Id == chat.Model))
        {
            models = await LoadModelsAsync(userId, includePaid, refresh: true, cancellationToken);
            if (!models.Any(item => item.Id == chat.Model))
            {
                throw new OpenRouterValidationException(includePaid ? "That model is not on the list." : "That model is not on the free list.");
            }
        }

        await keys.RequireKeyAsync(userId, cancellationToken);
        var turns = markdown ? OpenRouterRules.ForMarkdownReply(chat.Messages) : chat.Messages;
        return new PreparedChat(chat.Model, turns);
    }

    public async IAsyncEnumerable<string> StreamReplyAsync(
        Guid userId,
        PreparedChat prepared,
        [EnumeratorCancellation] CancellationToken cancellationToken)
    {
        var apiKey = await keys.RequireKeyAsync(userId, cancellationToken);
        await foreach (var delta in openRouter.StreamAsync(apiKey, prepared.Model, prepared.Messages, cancellationToken))
        {
            yield return delta;
        }
    }

    public async Task<SavedChat> SaveChatAsync(
        Guid userId,
        string? model,
        string? modelName,
        IReadOnlyList<OpenRouterTurnInput>? messages,
        CancellationToken cancellationToken)
    {
        var chat = OpenRouterRules.NormalizeChat(model, messages);
        var file = OpenRouterRules.ToChatFile(modelName, chat);
        var bytes = Encoding.UTF8.GetBytes(file.Markdown);
        var session = await uploads.BeginAsync(
            new BeginUploadRequest(
                userId,
                file.FileName,
                OpenRouterRules.ChatContentType,
                bytes.Length,
                null,
                Retention.Forever(),
                null),
            cancellationToken);
        await using var stream = new MemoryStream(bytes);
        await uploads.PutAsync(session.SessionId, userId, stream, cancellationToken);
        var stored = await uploads.CompleteAsync(session.SessionId, userId, cancellationToken);
        return new SavedChat(stored.Id, file.Title, stored.OriginalFileName);
    }

    private async Task<IReadOnlyList<OpenRouterListedModel>> LoadModelsAsync(
        Guid userId,
        bool includePaid,
        bool refresh,
        CancellationToken cancellationToken)
    {
        var cacheKey = ModelsCacheKey(userId, includePaid);
        if (!refresh && cache.TryGetValue(cacheKey, out IReadOnlyList<OpenRouterListedModel>? cached) && cached is not null)
        {
            return cached;
        }

        var apiKey = await keys.RequireKeyAsync(userId, cancellationToken);
        var models = includePaid
            ? await openRouter.ListAllAsync(apiKey, cancellationToken)
            : await openRouter.ListFreeAsync(apiKey, cancellationToken);
        IReadOnlyList<OpenRouterListedModel> sorted = models
            .GroupBy(item => item.Id, StringComparer.Ordinal)
            .Select(group => group.First())
            .OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Id, StringComparer.Ordinal)
            .ToList();
        cache.Set(cacheKey, sorted, TimeSpan.FromMinutes(10));
        return sorted;
    }

    private static string ModelsCacheKey(Guid userId, bool includePaid) =>
        (includePaid ? "openrouter-models-all:" : "openrouter-models:") + userId.ToString("N");
}
