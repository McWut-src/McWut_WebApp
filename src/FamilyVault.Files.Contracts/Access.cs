namespace FamilyVault.Files.Contracts;

public sealed record AccessContext(Guid? UserId, string? ShareToken, string? ProvidedPassword);

public sealed record AccessDecision(bool Allowed, bool RequiresPassword)
{
    public static AccessDecision Allow { get; } = new(true, false);
    public static AccessDecision Deny { get; } = new(false, false);
    public static AccessDecision PasswordRequired { get; } = new(false, true);
}
