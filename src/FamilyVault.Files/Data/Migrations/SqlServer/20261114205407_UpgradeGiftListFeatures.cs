using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations.SqlServer
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
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ClaimStatus",
                table: "ChristmasGiftItems",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "claimed");

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByUserId",
                table: "ChristmasGiftItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAdultSurprise",
                table: "ChristmasGiftItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeletedByOwner",
                table: "ChristmasGiftItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsMostWanted",
                table: "ChristmasGiftItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Occasion",
                table: "ChristmasGiftItems",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "anytime");

            migrationBuilder.AddColumn<bool>(
                name: "OpenToSplit",
                table: "ChristmasGiftItems",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SplitContributorIdsJson",
                table: "ChristmasGiftItems",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GiftMemberProfiles",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ShirtSize = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ShoeSize = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    PantsSize = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    FavoriteColors = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    InterestsAndAvoid = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
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
