using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FamilyVault.Files.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialVault : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FamilyMembers",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    FirstSeenAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    LastSeenAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamilyMembers", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "FileAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    At = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    Action = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    TargetKind = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ShareToken = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    Detail = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileAudits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ShareLinks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Token = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    TargetKind = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    MaxDownloads = table.Column<int>(type: "INTEGER", nullable: true),
                    DownloadCount = table.Column<int>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    AllowPreview = table.Column<bool>(type: "INTEGER", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShareLinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Drops",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    MaxDownloads = table.Column<int>(type: "INTEGER", nullable: true),
                    DownloadCount = table.Column<int>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Drops", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Drops_FamilyMembers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "FileGrants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TargetKind = table.Column<int>(type: "INTEGER", nullable: false),
                    TargetId = table.Column<Guid>(type: "TEXT", nullable: false),
                    UserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Permission = table.Column<int>(type: "INTEGER", nullable: false),
                    GrantedByUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    GrantedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FileGrants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FileGrants_FamilyMembers_UserId",
                        column: x => x.UserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "StoredFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OriginalFileName = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    SizeBytes = table.Column<long>(type: "INTEGER", nullable: false),
                    StorageKey = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    MaxDownloads = table.Column<int>(type: "INTEGER", nullable: true),
                    DownloadCount = table.Column<int>(type: "INTEGER", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    DropId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ChecksumSha256 = table.Column<string>(type: "TEXT", maxLength: 64, nullable: true),
                    DeletedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoredFiles_Drops_DropId",
                        column: x => x.DropId,
                        principalTable: "Drops",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_StoredFiles_FamilyMembers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "FamilyMembers",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UploadSessions",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StorageKey = table.Column<string>(type: "TEXT", maxLength: 128, nullable: false),
                    ExpectedSize = table.Column<long>(type: "INTEGER", nullable: false),
                    BytesReceived = table.Column<long>(type: "INTEGER", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UploadSessions", x => x.SessionId);
                    table.ForeignKey(
                        name: "FK_UploadSessions_StoredFiles_FileId",
                        column: x => x.FileId,
                        principalTable: "StoredFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Drops_OwnerUserId_DeletedAt",
                table: "Drops",
                columns: new[] { "OwnerUserId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_FileAudits_At",
                table: "FileAudits",
                column: "At");

            migrationBuilder.CreateIndex(
                name: "IX_FileGrants_TargetKind_TargetId",
                table: "FileGrants",
                columns: new[] { "TargetKind", "TargetId" });

            migrationBuilder.CreateIndex(
                name: "IX_FileGrants_TargetKind_TargetId_UserId",
                table: "FileGrants",
                columns: new[] { "TargetKind", "TargetId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FileGrants_UserId",
                table: "FileGrants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinks_TargetKind_TargetId",
                table: "ShareLinks",
                columns: new[] { "TargetKind", "TargetId" });

            migrationBuilder.CreateIndex(
                name: "IX_ShareLinks_Token",
                table: "ShareLinks",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_DropId",
                table: "StoredFiles",
                column: "DropId");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_ExpiresAt",
                table: "StoredFiles",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_OwnerUserId_Status_DeletedAt",
                table: "StoredFiles",
                columns: new[] { "OwnerUserId", "Status", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_StoredFiles_StorageKey",
                table: "StoredFiles",
                column: "StorageKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UploadSessions_ExpiresAt",
                table: "UploadSessions",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_UploadSessions_FileId",
                table: "UploadSessions",
                column: "FileId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FileAudits");

            migrationBuilder.DropTable(
                name: "FileGrants");

            migrationBuilder.DropTable(
                name: "ShareLinks");

            migrationBuilder.DropTable(
                name: "UploadSessions");

            migrationBuilder.DropTable(
                name: "StoredFiles");

            migrationBuilder.DropTable(
                name: "Drops");

            migrationBuilder.DropTable(
                name: "FamilyMembers");
        }
    }
}
