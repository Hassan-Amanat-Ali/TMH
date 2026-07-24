-- CreateTable
CREATE TABLE `AppSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `launchMode` ENUM('COMING_SOON', 'LIVE') NOT NULL DEFAULT 'COMING_SOON',
    `comingSoonImageUrl` LONGTEXT NULL,
    `headline` VARCHAR(191) NOT NULL DEFAULT 'Thai My Heart is almost ready',
    `subtext` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
