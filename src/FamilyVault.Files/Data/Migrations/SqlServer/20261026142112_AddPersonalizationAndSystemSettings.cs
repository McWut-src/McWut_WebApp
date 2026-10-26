using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class AddPersonalizationAndSystemSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SystemSettings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ValueCipher = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemSettings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "UserPersonalizations",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    StatusTag = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    HeaderBadge = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    HeaderMotif = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BackgroundTile = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ChimeTheme = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserPersonalizations", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_UserPersonalizations_FamilyMembers_UserId",
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
                name: "SystemSettings");

            migrationBuilder.DropTable(
                name: "UserPersonalizations");
        }
    }
}
