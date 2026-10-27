namespace McWutWebApp.Hosting;

public sealed partial class PersonalizationService
{
    public static readonly IReadOnlyList<PaletteSwatch> Swatches =
    [
        new("#0b1f3a", "Navy"),
        new("#334155", "Slate"),
        new("#1e3a8a", "Oxford"),
        new("#065f46", "Forest"),
        new("#881337", "Burgundy"),
        new("#b45309", "Cognac"),
        new("#581c87", "Plum"),
        new("#78350f", "Espresso")
    ];

    public static readonly IReadOnlyList<TeenColorSwatch> TeenSwatches =
        Swatches.Select(s => new TeenColorSwatch(s.Hex, s.Label)).ToList();

    public static readonly IReadOnlyList<(string Id, string Label)> ChimeThemes =
    [
        ("classic", "Classic"),
        ("soft-bell", "Bell"),
        ("acoustic-wood", "Acoustic Wood"),
        ("executive-pulse", "Executive Pulse"),
        ("minimal-tap", "Minimal Tap")
    ];

    public static readonly IReadOnlyList<PresetOption> BadgePresets =
    [
        new("none", "None", ""),
        new("preset:crest-shield", "Crest", "/api/personalization/preset/badge/crest-shield.svg"),
        new("preset:compass-star", "Compass", "/api/personalization/preset/badge/compass-star.svg"),
        new("preset:quill-pen", "Quill", "/api/personalization/preset/badge/quill-pen.svg"),
        new("preset:anchor-seal", "Anchor", "/api/personalization/preset/badge/anchor-seal.svg"),
        new("preset:crown-regal", "Crown", "/api/personalization/preset/badge/crown-regal.svg"),
        new("preset:monogram-seal", "Monogram", "/api/personalization/preset/badge/monogram-seal.svg"),
        new("preset:summit-peak", "Summit", "/api/personalization/preset/badge/summit-peak.svg"),
        new("preset:geometric-gem", "Geometric Gem", "/api/personalization/preset/badge/geometric-gem.svg")
    ];

    public static readonly IReadOnlyList<PresetOption> MotifPresets =
    [
        new("none", "Solid Bar (Default)", ""),
        new("preset:metro-grid", "Architectural Grid", "/api/personalization/preset/motif/metro-grid.svg"),
        new("preset:horizon-waves", "Serene Waves", "/api/personalization/preset/motif/horizon-waves.svg"),
        new("preset:summit-ridge", "Alpine Horizon", "/api/personalization/preset/motif/summit-ridge.svg"),
        new("preset:herringbone", "Herringbone Weave", "/api/personalization/preset/motif/herringbone.svg"),
        new("preset:constellation", "Night Constellation", "/api/personalization/preset/motif/constellation.svg")
    ];

    public static readonly IReadOnlyList<PresetOption> TilePresets =
    [
        new("none", "Clean Solid (Default)", ""),
        new("preset:linen-weave", "Fine Linen Texture", "/api/personalization/preset/tile/linen-weave.svg"),
        new("preset:architect-dots", "Architectural Dot Matrix", "/api/personalization/preset/tile/architect-dots.svg"),
        new("preset:diamond-lattice", "Diamond Lattice", "/api/personalization/preset/tile/diamond-lattice.svg"),
        new("preset:isometric-cubes", "Isometric Tessellation", "/api/personalization/preset/tile/isometric-cubes.svg"),
        new("preset:art-deco", "Art Deco Geometry", "/api/personalization/preset/tile/art-deco.svg"),
        new("preset:botanical-leaf", "Botanical Laurel", "/api/personalization/preset/tile/botanical-leaf.svg")
    ];
}
