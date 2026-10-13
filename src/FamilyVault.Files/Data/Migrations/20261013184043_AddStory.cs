using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddStory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsStory",
                table: "Drops",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsStory",
                table: "Drops");
        }
    }
}
