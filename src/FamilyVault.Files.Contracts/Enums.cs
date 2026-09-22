namespace FamilyVault.Files.Contracts;

public enum FileStatus
{
    Pending = 0,
    Ready = 1,
    Failed = 2
}

public enum ShareTargetKind
{
    File = 0,
    Drop = 1
}

public enum FilePermission
{
    View = 1,
    Download = 2,
    Manage = 3
}

public enum AccessIntent
{
    List = 1,
    Preview = 2,
    Download = 3,
    Manage = 4
}

public enum UploadSessionStatus
{
    Open = 0,
    Completed = 1,
    Aborted = 2
}

public static class FilePermissionExtensions
{
    public static bool Covers(this FilePermission permission, AccessIntent intent) => intent switch
    {
        AccessIntent.List or AccessIntent.Preview => permission >= FilePermission.View,
        AccessIntent.Download => permission >= FilePermission.Download,
        AccessIntent.Manage => permission >= FilePermission.Manage,
        _ => false
    };
}
