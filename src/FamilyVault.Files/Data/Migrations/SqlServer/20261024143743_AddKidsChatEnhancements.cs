using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations.SqlServer
{
    /// <inheritdoc />
    public partial class AddKidsChatEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DirectConversations_LowUserId_HighUserId",
                table: "DirectConversations");

            migrationBuilder.AddColumn<bool>(
                name: "IsChatOnly",
                table: "StoredFiles",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "AttachmentFileId",
                table: "DirectMessages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentType",
                table: "DirectMessages",
                type: "nvarchar(24)",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "DirectMessages",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuotedAuthor",
                table: "DirectMessages",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuotedSnippet",
                table: "DirectMessages",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReplyToMessageId",
                table: "DirectMessages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "HighReadSequence",
                table: "DirectConversations",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<bool>(
                name: "IsGroup",
                table: "DirectConversations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "LowReadSequence",
                table: "DirectConversations",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "DirectConversations",
                type: "nvarchar(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DirectConversationMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnreadCount = table.Column<int>(type: "int", nullable: false),
                    LastReadSequence = table.Column<long>(type: "bigint", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectConversationMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DirectConversationMembers_DirectConversations_ConversationId",
                        column: x => x.ConversationId,
                        principalTable: "DirectConversations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DirectConversationMembers_FamilyMembers_UserId",
                        column: x => x.UserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DirectMessageReactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Emoji = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectMessageReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DirectMessageReactions_DirectMessages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "DirectMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DirectMessageReactions_FamilyMembers_UserId",
                        column: x => x.UserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessages_AttachmentFileId",
                table: "DirectMessages",
                column: "AttachmentFileId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessages_ExpiresAt",
                table: "DirectMessages",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversations_LowUserId_HighUserId",
                table: "DirectConversations",
                columns: new[] { "LowUserId", "HighUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversationMembers_ConversationId_UserId",
                table: "DirectConversationMembers",
                columns: new[] { "ConversationId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversationMembers_UserId",
                table: "DirectConversationMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReactions_MessageId_UserId_Emoji",
                table: "DirectMessageReactions",
                columns: new[] { "MessageId", "UserId", "Emoji" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReactions_UserId",
                table: "DirectMessageReactions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DirectConversationMembers");

            migrationBuilder.DropTable(
                name: "DirectMessageReactions");

            migrationBuilder.DropIndex(
                name: "IX_DirectMessages_AttachmentFileId",
                table: "DirectMessages");

            migrationBuilder.DropIndex(
                name: "IX_DirectMessages_ExpiresAt",
                table: "DirectMessages");

            migrationBuilder.DropIndex(
                name: "IX_DirectConversations_LowUserId_HighUserId",
                table: "DirectConversations");

            migrationBuilder.DropColumn(
                name: "IsChatOnly",
                table: "StoredFiles");

            migrationBuilder.DropColumn(
                name: "AttachmentFileId",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "AttachmentType",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "QuotedAuthor",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "QuotedSnippet",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "ReplyToMessageId",
                table: "DirectMessages");

            migrationBuilder.DropColumn(
                name: "HighReadSequence",
                table: "DirectConversations");

            migrationBuilder.DropColumn(
                name: "IsGroup",
                table: "DirectConversations");

            migrationBuilder.DropColumn(
                name: "LowReadSequence",
                table: "DirectConversations");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "DirectConversations");

            migrationBuilder.CreateIndex(
                name: "IX_DirectConversations_LowUserId_HighUserId",
                table: "DirectConversations",
                columns: new[] { "LowUserId", "HighUserId" },
                unique: true);
        }
    }
}
