using Microsoft.AspNetCore.Mvc.RazorPages;

namespace McWutWebApp.Pages.Games;

public sealed record HubGameViewModel(
    string Key,
    string Title,
    string AccentColor,
    string ShortTag,
    string Description,
    bool IsAvailable,
    bool IsNew = false);

public class IndexModel : PageModel
{
    public IReadOnlyList<HubGameViewModel> Games { get; private set; } = [];

    public void OnGet()
    {
        Response.Headers.CacheControl = "no-store";
        Games =
        [
            new("stack-3d", "Stack 3D", "#38bdf8", "3D Tower", "Time your drops and build the highest neon tower.", true),
            new("mini-crossword", "Mini Crossword", "#f43f5e", "5×5 Daily", "Daily 5×5 crossword with hints and speed bonuses.", true),
            new("minesweeper", "Minesweeper", "#fb7185", "Neon Grid", "Safe first click, cascade combos, and chord reveals.", true),
            new("neon-slope", "Neon Slope", "#22d3ee", "3D Tunnel", "High-speed endless tunnel runner with gem streaks.", true),
            new("merge-2048", "2048 Neon", "#f59e0b", "Tile Puzzle", "Slide and merge matching tiles to reach 2048.", true),
            new("wacky-wheels", "Wacky Wheels", "#22c55e", "Ragdoll Stunt", "Slapstick ragdoll physics buggy obstacle course.", true, IsNew: false),
            new("brick-breaker", "Cyber Breakout", "#ec4899", "Laser Paddle", "Neon brick breaker with lasers and multiball.", true, IsNew: false),
            new("hextris", "Hextris Neon", "#a855f7", "Hex Match", "Catch falling colored bars on the rotating hexagon.", true, IsNew: true)
        ];
    }
}
