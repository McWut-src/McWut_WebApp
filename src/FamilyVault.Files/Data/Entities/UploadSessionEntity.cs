using FamilyVault.Files.Contracts;

namespace FamilyVault.Files.Data.Entities;

public sealed class UploadSessionEntity
{
    public Guid SessionId { get; set; }
    public Guid FileId { get; set; }
    public StoredFileEntity File { get; set; } = null!;
    public Guid OwnerUserId { get; set; }
    public string StorageKey { get; set; } = "";
    public long ExpectedSize { get; set; }
    public long BytesReceived { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public UploadSessionStatus Status { get; set; }
}
