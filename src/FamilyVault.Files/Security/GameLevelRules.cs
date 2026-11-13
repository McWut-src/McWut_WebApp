using System.Text.Json;
using System.Text.Json.Serialization;

namespace FamilyVault.Files.Security;

public static class GameLevelRules
{
    public const int TitleMax = 80;
    public const int DescriptionMax = 240;
    public const int JsonMaxLength = 65_536;
    public const int MaxLevelsPerUser = 50;

    public const double MinFinishX = 700;
    public const double MaxFinishX = 12_000;
    public const double MinWorldX = -220;
    public const double MaxWorldX = 13_000;
    public const double MinWorldY = -450;
    public const double MaxWorldY = 820;

    public const int MaxStrips = 28;
    public const int MaxTotalPoints = 320;
    public const int MaxLoops = 6;
    public const int MaxSprings = 30;
    public const int MaxWreckingBalls = 20;
    public const int MaxCrates = 60;
    public const int MaxStars = 40;
    public const int MaxSpikes = 40;
    public const int MaxCheckpoints = 12;
    public const int MaxTntCrates = 24;
    public const int MaxFans = 16;
    public const int MaxSeesaws = 12;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static string ValidateTitle(string? title)
    {
        var clean = (title ?? "").Trim();
        if (clean.Length == 0)
        {
            throw new GameScoreValidationException("Give your level a name.");
        }

        if (clean.Length > TitleMax)
        {
            throw new GameScoreValidationException($"Level name must be {TitleMax} characters or fewer.");
        }

        return clean;
    }

    public static string ValidateDescription(string? description)
    {
        var clean = (description ?? "").Trim();
        if (clean.Length > DescriptionMax)
        {
            throw new GameScoreValidationException($"Description must be {DescriptionMax} characters or fewer.");
        }

        return clean;
    }

    public static string ValidateAndNormalizeLevelJson(string gameKey, string? rawJson)
    {
        var key = GameScoreRules.NormalizeGameKey(gameKey);
        if (key != GameScoreRules.WackyWheelsKey)
        {
            throw new GameScoreValidationException("Custom levels are currently supported for Wacky Wheels.");
        }

        if (string.IsNullOrWhiteSpace(rawJson))
        {
            throw new GameScoreValidationException("Level data cannot be empty.");
        }

        if (rawJson.Length > JsonMaxLength)
        {
            throw new GameScoreValidationException("Level data is too large.");
        }

        WackyWheelsLevelPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<WackyWheelsLevelPayload>(rawJson, JsonOptions);
        }
        catch (JsonException)
        {
            throw new GameScoreValidationException("Level data is not valid JSON.");
        }

        if (parsed is null)
        {
            throw new GameScoreValidationException("Level data is empty.");
        }

        var finishX = ClampFinite(parsed.FinishX, 2400, MinFinishX, MaxFinishX);

        var normalizedStrips = new List<WackyWheelsStrip>();
        var totalPts = 0;

        if (parsed.Strips is not null)
        {
            if (parsed.Strips.Count > MaxStrips)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxStrips} road sections.");
            }

            foreach (var s in parsed.Strips)
            {
                if (s?.Pts is null || s.Pts.Count < 2)
                {
                    continue;
                }

                var cleanPts = new List<double[]>(s.Pts.Count);
                foreach (var pt in s.Pts)
                {
                    if (pt is null || pt.Length < 2)
                    {
                        continue;
                    }

                    totalPts++;
                    if (totalPts > MaxTotalPoints)
                    {
                        throw new GameScoreValidationException($"A level can have at most {MaxTotalPoints} terrain points.");
                    }

                    var px = Math.Round(ClampFinite(pt[0], 0, MinWorldX, MaxWorldX), 1);
                    var py = Math.Round(ClampFinite(pt[1], 420, MinWorldY, MaxWorldY), 1);
                    cleanPts.Add([px, py]);
                }

                if (cleanPts.Count >= 2)
                {
                    normalizedStrips.Add(new WackyWheelsStrip
                    {
                        Pts = cleanPts,
                        Boost = s.Boost == true ? true : null,
                        Bridge = s.Bridge == true ? true : null
                    });
                }
            }
        }

        // Guarantee a safe starting platform under x = 110 if no strip covers the spawn zone
        var hasSpawnGround = normalizedStrips.Any(s =>
            s.Pts.Any(p => p[0] <= 70 && p[1] >= 350 && p[1] <= 470) &&
            s.Pts.Any(p => p[0] >= 180 && p[1] >= 350 && p[1] <= 470));

        if (!hasSpawnGround)
        {
            normalizedStrips.Insert(0, new WackyWheelsStrip
            {
                Pts = [[-120, 420], [280, 420]]
            });
        }

        var loops = new List<WackyWheelsLoop>();
        if (parsed.Loops is not null)
        {
            if (parsed.Loops.Count > MaxLoops)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxLoops} loops.");
            }

            foreach (var lp in parsed.Loops)
            {
                if (lp is null) continue;
                loops.Add(new WackyWheelsLoop
                {
                    X = Math.Round(ClampFinite(lp.X, 1200, 320, MaxWorldX - 300), 1),
                    Y = Math.Round(ClampFinite(lp.Y, 275, -150, 620), 1),
                    R = Math.Round(ClampFinite(lp.R, 150, 95, 210), 1)
                });
            }
        }

        var springs = new List<WackyWheelsSpring>();
        if (parsed.Springs is not null)
        {
            if (parsed.Springs.Count > MaxSprings)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxSprings} springboards.");
            }

            foreach (var sp in parsed.Springs)
            {
                if (sp is null) continue;
                springs.Add(new WackyWheelsSpring
                {
                    X = Math.Round(ClampFinite(sp.X, 600, 180, MaxWorldX), 1),
                    Y = Math.Round(ClampFinite(sp.Y, 420, MinWorldY, MaxWorldY), 1),
                    W = Math.Round(ClampFinite(sp.W ?? 62, 62, 40, 110), 1)
                });
            }
        }

        var wreckingBalls = new List<WackyWheelsBall>();
        if (parsed.WreckingBalls is not null)
        {
            if (parsed.WreckingBalls.Count > MaxWreckingBalls)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxWreckingBalls} wrecking balls.");
            }

            foreach (var wb in parsed.WreckingBalls)
            {
                if (wb is null) continue;
                wreckingBalls.Add(new WackyWheelsBall
                {
                    PivotX = Math.Round(ClampFinite(wb.PivotX, 900, 240, MaxWorldX), 1),
                    PivotY = Math.Round(ClampFinite(wb.PivotY, 130, MinWorldY, 600), 1),
                    Length = Math.Round(ClampFinite(wb.Length, 210, 90, 340), 1),
                    Radius = Math.Round(ClampFinite(wb.Radius ?? 28, 28, 18, 46), 1),
                    Amp = Math.Round(ClampFinite(wb.Amp ?? 0.7, 0.7, 0.2, 1.25), 2),
                    Speed = Math.Round(ClampFinite(wb.Speed ?? 2.15, 2.15, 0.8, 4.2), 2),
                    Phase = Math.Round(ClampFinite(wb.Phase ?? 0, 0, 0, 6.28), 2)
                });
            }
        }

        var crates = NormalizePoints(parsed.Crates, MaxCrates, "crates", 180, 600, 420);
        var stars = NormalizePoints(parsed.Stars, MaxStars, "bonus stars", 160, 500, 340);
        var checkpoints = NormalizePoints(parsed.Checkpoints, MaxCheckpoints, "checkpoints", 240, 900, 420);
        var tntCrates = NormalizePoints(parsed.TntCrates, MaxTntCrates, "TNT crates", 180, 600, 420);

        var spikes = new List<WackyWheelsSpike>();
        if (parsed.Spikes is not null)
        {
            if (parsed.Spikes.Count > MaxSpikes)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxSpikes} spike strips.");
            }

            foreach (var spk in parsed.Spikes)
            {
                if (spk is null) continue;
                spikes.Add(new WackyWheelsSpike
                {
                    X = Math.Round(ClampFinite(spk.X, 600, 180, MaxWorldX), 1),
                    Y = Math.Round(ClampFinite(spk.Y, 420, -120, MaxWorldY), 1),
                    W = Math.Round(ClampFinite(spk.W ?? 64, 64, 40, 120), 1)
                });
            }
        }

        var fans = new List<WackyWheelsFan>();
        if (parsed.Fans is not null)
        {
            if (parsed.Fans.Count > MaxFans)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxFans} air fans.");
            }

            foreach (var fn in parsed.Fans)
            {
                if (fn is null) continue;
                fans.Add(new WackyWheelsFan
                {
                    X = Math.Round(ClampFinite(fn.X, 800, 200, MaxWorldX), 1),
                    Y = Math.Round(ClampFinite(fn.Y, 420, MinWorldY, MaxWorldY), 1),
                    W = Math.Round(ClampFinite(fn.W ?? 92, 92, 50, 160), 1),
                    H = Math.Round(ClampFinite(fn.H ?? 240, 240, 100, 420), 1),
                    Power = Math.Round(ClampFinite(fn.Power ?? 1450, 1450, 700, 2400), 0)
                });
            }
        }

        var seesaws = new List<WackyWheelsSeesaw>();
        if (parsed.Seesaws is not null)
        {
            if (parsed.Seesaws.Count > MaxSeesaws)
            {
                throw new GameScoreValidationException($"A level can have at most {MaxSeesaws} see-saws.");
            }

            foreach (var ss in parsed.Seesaws)
            {
                if (ss is null) continue;
                seesaws.Add(new WackyWheelsSeesaw
                {
                    X = Math.Round(ClampFinite(ss.X, 800, 220, MaxWorldX), 1),
                    Y = Math.Round(ClampFinite(ss.Y, 400, MinWorldY, MaxWorldY), 1),
                    Len = Math.Round(ClampFinite(ss.Len ?? 200, 200, 120, 360), 1),
                    MaxAngle = Math.Round(ClampFinite(ss.MaxAngle ?? 0.45, 0.45, 0.2, 0.65), 2)
                });
            }
        }

        var cleanPayload = new WackyWheelsLevelPayload
        {
            Version = 1,
            FinishX = Math.Round(finishX, 1),
            Strips = normalizedStrips,
            Loops = loops,
            Springs = springs,
            WreckingBalls = wreckingBalls,
            Crates = crates,
            Stars = stars,
            Spikes = spikes,
            Checkpoints = checkpoints.Count > 0 ? checkpoints : null,
            TntCrates = tntCrates.Count > 0 ? tntCrates : null,
            Fans = fans.Count > 0 ? fans : null,
            Seesaws = seesaws.Count > 0 ? seesaws : null
        };

        var serialized = JsonSerializer.Serialize(cleanPayload, JsonOptions);
        if (serialized.Length > JsonMaxLength)
        {
            throw new GameScoreValidationException("Normalized level data exceeds maximum allowed size.");
        }

        return serialized;
    }

    private static List<WackyWheelsPoint> NormalizePoints(
        List<WackyWheelsPoint>? source,
        int maxCount,
        string label,
        double minX,
        double fallbackX,
        double fallbackY)
    {
        var list = new List<WackyWheelsPoint>();
        if (source is null)
        {
            return list;
        }

        if (source.Count > maxCount)
        {
            throw new GameScoreValidationException($"A level can have at most {maxCount} {label}.");
        }

        foreach (var pt in source)
        {
            if (pt is null) continue;
            list.Add(new WackyWheelsPoint
            {
                X = Math.Round(ClampFinite(pt.X, fallbackX, minX, MaxWorldX), 1),
                Y = Math.Round(ClampFinite(pt.Y, fallbackY, MinWorldY, MaxWorldY), 1)
            });
        }

        return list;
    }

    private static double ClampFinite(double value, double fallback, double min, double max)
    {
        if (double.IsNaN(value) || double.IsInfinity(value))
        {
            return fallback;
        }

        return Math.Clamp(value, min, max);
    }

    private sealed class WackyWheelsLevelPayload
    {
        public int Version { get; set; } = 1;
        public double FinishX { get; set; } = 2400;
        public List<WackyWheelsStrip>? Strips { get; set; }
        public List<WackyWheelsLoop>? Loops { get; set; }
        public List<WackyWheelsSpring>? Springs { get; set; }
        public List<WackyWheelsBall>? WreckingBalls { get; set; }
        public List<WackyWheelsPoint>? Crates { get; set; }
        public List<WackyWheelsPoint>? Stars { get; set; }
        public List<WackyWheelsSpike>? Spikes { get; set; }
        public List<WackyWheelsPoint>? Checkpoints { get; set; }
        public List<WackyWheelsPoint>? TntCrates { get; set; }
        public List<WackyWheelsFan>? Fans { get; set; }
        public List<WackyWheelsSeesaw>? Seesaws { get; set; }
    }

    private sealed class WackyWheelsStrip
    {
        public List<double[]> Pts { get; set; } = [];
        public bool? Boost { get; set; }
        public bool? Bridge { get; set; }
    }

    private sealed class WackyWheelsLoop
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double R { get; set; }
    }

    private sealed class WackyWheelsSpring
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double? W { get; set; }
    }

    private sealed class WackyWheelsBall
    {
        public double PivotX { get; set; }
        public double PivotY { get; set; }
        public double Length { get; set; }
        public double? Radius { get; set; }
        public double? Amp { get; set; }
        public double? Speed { get; set; }
        public double? Phase { get; set; }
    }

    private sealed class WackyWheelsPoint
    {
        public double X { get; set; }
        public double Y { get; set; }
    }

    private sealed class WackyWheelsSpike
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double? W { get; set; }
    }

    private sealed class WackyWheelsFan
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double? W { get; set; }
        public double? H { get; set; }
        public double? Power { get; set; }
    }

    private sealed class WackyWheelsSeesaw
    {
        public double X { get; set; }
        public double Y { get; set; }
        public double? Len { get; set; }
        public double? MaxAngle { get; set; }
    }
}
