namespace FamilyVault.Files.Contracts;

public abstract class VaultException : Exception
{
    protected VaultException(string message) : base(message)
    {
    }
}

public sealed class QuotaExceededException : VaultException
{
    public QuotaExceededException(long usedBytes, long additionalBytes, long quotaBytes)
        : base($"Quota exceeded. Used {usedBytes} bytes, additional {additionalBytes} bytes, quota {quotaBytes} bytes.")
    {
        UsedBytes = usedBytes;
        AdditionalBytes = additionalBytes;
        QuotaBytes = quotaBytes;
    }

    public long UsedBytes { get; }
    public long AdditionalBytes { get; }
    public long QuotaBytes { get; }
}

public sealed class FileTooLargeException : VaultException
{
    public FileTooLargeException(long sizeBytes, long maxBytes)
        : base($"File size {sizeBytes} exceeds the maximum of {maxBytes} bytes.")
    {
        SizeBytes = sizeBytes;
        MaxBytes = maxBytes;
    }

    public long SizeBytes { get; }
    public long MaxBytes { get; }
}

public sealed class InvalidFileNameException : VaultException
{
    public InvalidFileNameException(string message) : base(message)
    {
    }
}

public sealed class InvalidContentTypeException : VaultException
{
    public InvalidContentTypeException(string contentType)
        : base($"Content type '{contentType}' is not allowed.")
    {
        ContentType = contentType;
    }

    public string ContentType { get; }
}

public sealed class VaultNotFoundException : VaultException
{
    public VaultNotFoundException() : base("The requested item was not found.")
    {
    }
}

public sealed class PasswordRequiredException : VaultException
{
    public PasswordRequiredException() : base("A password is required.")
    {
    }
}

public sealed class InvalidRangeException : VaultException
{
    public InvalidRangeException() : base("The requested range is invalid.")
    {
    }
}
