namespace McWutWebApp.Hosting;

public sealed record PersonalizationSettings(
    string StatusTag = "",
    string HeaderBadge = "none",
    string HeaderMotif = "none",
    string BackgroundTile = "none",
    string ChimeTheme = "classic");

public sealed record CustomSvgItemView(
    Guid Id,
    string Kind,
    string Value,
    string Label,
    string Url);

public sealed record PresetOption(string Value, string Label, string Url);

public sealed record PaletteSwatch(string Hex, string Label);

public sealed record TeenColorSwatch(string Hex, string Label);

public sealed record PersonalizationStateView(
    PersonalizationSettings Settings,
    IReadOnlyList<CustomSvgItemView> CustomItems,
    string? BadgeUrl,
    string? MotifUrl,
    string? TileUrl);
