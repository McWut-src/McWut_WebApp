using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddChristmasGiftItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChristmasGiftItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    Url = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: true),
                    ImageFileId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ImageType = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true),
                    ClaimedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ClaimedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ClaimNotes = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChristmasGiftItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChristmasGiftItems_FamilyMembers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChristmasGiftItems_ClaimedByUserId",
                table: "ChristmasGiftItems",
                column: "ClaimedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChristmasGiftItems_ImageFileId",
                table: "ChristmasGiftItems",
                column: "ImageFileId");

            migrationBuilder.CreateIndex(
                name: "IX_ChristmasGiftItems_OwnerUserId_SortOrder",
                table: "ChristmasGiftItems",
                columns: new[] { "OwnerUserId", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChristmasGiftItems");
        }
    }
}
