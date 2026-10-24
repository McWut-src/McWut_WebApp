using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations
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
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "AttachmentFileId",
                table: "DirectMessages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttachmentType",
                table: "DirectMessages",
                type: "TEXT",
                maxLength: 24,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ExpiresAt",
                table: "DirectMessages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuotedAuthor",
                table: "DirectMessages",
                type: "TEXT",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuotedSnippet",
                table: "DirectMessages",
                type: "TEXT",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ReplyToMessageId",
                table: "DirectMessages",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "HighReadSequence",
                table: "DirectConversations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<bool>(
                name: "IsGroup",
                table: "DirectConversations",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "LowReadSequence",
                table: "DirectConversations",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "DirectConversations",
                type: "TEXT",
                maxLength: 80,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DirectConversationMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ConversationId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UnreadCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastReadSequence = table.Column<long>(type: "INTEGER", nullable: false),
                    JoinedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
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
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    MessageId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Emoji = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
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
