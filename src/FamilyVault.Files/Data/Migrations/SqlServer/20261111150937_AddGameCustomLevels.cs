using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class AddGameCustomLevels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GameCustomLevels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GameKey = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    AuthorUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    LevelJson = table.Column<string>(type: "nvarchar(max)", maxLength: 65536, nullable: false),
                    PlaysCount = table.Column<int>(type: "int", nullable: false),
                    ClearsCount = table.Column<int>(type: "int", nullable: false),
                    BestScore = table.Column<int>(type: "int", nullable: false),
                    BestTimeMs = table.Column<int>(type: "int", nullable: true),
                    RecordHolderUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GameCustomLevels", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GameCustomLevels_FamilyMembers_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GameCustomLevels_AuthorUserId",
                table: "GameCustomLevels",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GameCustomLevels_GameKey",
                table: "GameCustomLevels",
                column: "GameKey");

            migrationBuilder.CreateIndex(
                name: "IX_GameCustomLevels_GameKey_AuthorUserId",
                table: "GameCustomLevels",
                columns: new[] { "GameKey", "AuthorUserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GameCustomLevels");
        }
    }
}
