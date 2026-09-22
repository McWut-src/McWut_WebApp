namespace FamilyVault.Files.Contracts;

public sealed record CreateDropRequest(string? Title, Retention Retention, string? Password);

public sealed record UpdateDropRequest(string? Title, Retention? Retention, string? Password, bool ClearPassword);

public sealed record UpdateStoredFileRequest(Retention? Retention, string? Password, bool ClearPassword);

public sealed record BeginUploadRequest(
    Guid OwnerUserId,
    string OriginalFileName,
    string ContentType,
    long SizeBytes,
    Guid? DropId,
    Retention Retention,
    string? Password);

public sealed record CreateShareLinkRequest(Retention Retention, string? Password, bool AllowPreview);

public sealed record GrantRequest(Guid UserId, FilePermission Permission);
