using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpgradeGiftListFeatures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoryTag",
                table: "ChristmasGiftItems",
                type: "TEXT",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClaimStatus",
                table: "ChristmasGiftItems",
                type: "TEXT",
                maxLength: 32,
                nullable: false,
                defaultValue: "claimed");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "ChristmasGiftItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdultSurprise",
                table: "ChristmasGiftItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeletedByOwner",
                table: "ChristmasGiftItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsMostWanted",
                table: "ChristmasGiftItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Occasion",
                table: "ChristmasGiftItems",
                type: "TEXT",
                maxLength: 32,
                nullable: false,
                defaultValue: "anytime");

            migrationBuilder.AddColumn<bool>(
                name: "OpenToSplit",
                table: "ChristmasGiftItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SplitContributorIdsJson",
                table: "ChristmasGiftItems",
                type: "TEXT",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GiftMemberProfiles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ShirtSize = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    ShoeSize = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    PantsSize = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    FavoriteColors = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    InterestsAndAvoid = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GiftMemberProfiles", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_GiftMemberProfiles_FamilyMembers_UserId",
                        column: x => x.UserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GiftMemberProfiles");

            migrationBuilder.DropColumn(
                name: "CategoryTag",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "ClaimStatus",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "IsAdultSurprise",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "IsDeletedByOwner",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "IsMostWanted",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "Occasion",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "OpenToSplit",
                table: "ChristmasGiftItems");

            migrationBuilder.DropColumn(
                name: "SplitContributorIdsJson",
                table: "ChristmasGiftItems");
        }
    }
}
