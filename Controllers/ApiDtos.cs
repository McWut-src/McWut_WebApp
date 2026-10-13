using System.Text.Json.Serialization;
using FamilyVault.Files.Contracts;
using McWutWebApp.Hosting;

namespace McWutWebApp.Controllers;

public sealed class CreateDropBody
{
    public string? Title { get; set; }
    public RetentionInput? Retention { get; set; }
    public string? Password { get; set; }
    public bool IsStory { get; set; }
}

public sealed class PatchDropBody
{
    public string? Title { get; set; }
    public RetentionInput? Retention { get; set; }
    public string? Password { get; set; }
    public bool ClearPassword { get; set; }
}

public sealed class PatchFileBody
{
    public RetentionInput? Retention { get; set; }
    public string? Password { get; set; }
    public bool ClearPassword { get; set; }
}

public sealed class BeginUploadBody
{
    public string FileName { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public Guid? DropId { get; set; }
    public RetentionInput? Retention { get; set; }
    public string? Password { get; set; }
}

public sealed class CreateLinkBody
{
    public RetentionInput? Retention { get; set; }
    public string? Password { get; set; }
    public bool AllowPreview { get; set; } = true;
}

public sealed class GrantBody
{
    public Guid UserId { get; set; }
    public FilePermission Permission { get; set; } = FilePermission.Download;
}

public sealed class LinkResponse
{
    public required string Token { get; init; }
    public required string Url { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public bool HasPassword { get; init; }
    public bool AllowPreview { get; init; }
}

public sealed record MemberFileResponse(
    Guid Id,
    Guid OwnerUserId,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    FileStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    int? MaxDownloads,
    int DownloadCount,
    bool HasPassword,
    Guid? DropId,
    string? ChecksumSha256,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<MemberTag>? SharedWith = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? FromUserId = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FromName = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FromColor = null);

public sealed record StoryResponse(
    Guid Id,
    Guid OwnerUserId,
    string Title,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ExpiresAt,
    bool HasPassword,
    StoredFile? Body,
    IReadOnlyList<StoredFile> Attachments,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<MemberTag>? SharedWith = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] Guid? FromUserId = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FromName = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] string? FromColor = null);
