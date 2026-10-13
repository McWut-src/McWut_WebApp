using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations.SqlServer
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
                type: "bit",
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
