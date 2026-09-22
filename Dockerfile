# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER root
WORKDIR /app
RUN mkdir -p /app/data/vault /app/data/keys && chown -R $APP_UID:$APP_UID /app/data
USER $APP_UID
EXPOSE 8080
EXPOSE 8081

# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["McWutWebApp.csproj", "."]
COPY ["src/FamilyVault.Files.Contracts/FamilyVault.Files.Contracts.csproj", "src/FamilyVault.Files.Contracts/"]
COPY ["src/FamilyVault.Files/FamilyVault.Files.csproj", "src/FamilyVault.Files/"]
COPY ["src/FamilyVault.Files.Azure/FamilyVault.Files.Azure.csproj", "src/FamilyVault.Files.Azure/"]
RUN dotnet restore "./McWutWebApp.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "./McWutWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./McWutWebApp.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "McWutWebApp.dll"]
