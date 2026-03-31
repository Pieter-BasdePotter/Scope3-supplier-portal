-- CreateTable
CREATE TABLE `SupplierRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `supplierName` VARCHAR(191) NOT NULL,
    `supplierEmail` VARCHAR(191) NOT NULL,
    `referenceYear` INTEGER NOT NULL,
    `categoryContext` TEXT NOT NULL,
    `token` VARCHAR(64) NOT NULL,
    `tokenExpiresAt` DATETIME(3) NOT NULL,
    `status` ENUM('INVITED', 'STARTED', 'SUBMITTED', 'VALIDATED', 'ACCEPTED', 'REJECTED', 'PUBLISHED') NOT NULL DEFAULT 'INVITED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierRequest_token_key`(`token`),
    INDEX `SupplierRequest_token_idx`(`token`),
    INDEX `SupplierRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierResponse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `orgName` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `identifierType` VARCHAR(20) NOT NULL,
    `referenceYear` INTEGER NOT NULL,
    `dataSourceType` ENUM('MEASURED', 'CALCULATED', 'ESTIMATED', 'EXTERNAL_LCA') NOT NULL,
    `contactPerson` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `status` ENUM('INVITED', 'STARTED', 'SUBMITTED', 'VALIDATED', 'ACCEPTED', 'REJECTED', 'PUBLISHED') NOT NULL DEFAULT 'STARTED',
    `reviewNote` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SupplierResponse_requestId_key`(`requestId`),
    INDEX `SupplierResponse_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResponseItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `responseId` INTEGER NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `productCode` VARCHAR(191) NULL,
    `outputQty` DOUBLE NOT NULL,
    `outputUnit` VARCHAR(20) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `electricityKwh` DOUBLE NULL,
    `gasM3` DOUBLE NULL,
    `solidFuelKg` DOUBLE NULL,
    `transportTkm` DOUBLE NULL,
    `waterM3` DOUBLE NULL,
    `heatKwh` DOUBLE NULL,
    `otherInputs` JSON NULL,
    `manualCo2e` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ResponseItem_responseId_idx`(`responseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ResponseTransport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `responseId` INTEGER NOT NULL,
    `mode` ENUM('ROAD', 'RAIL', 'SEA', 'AIR') NOT NULL,
    `distanceKm` DOUBLE NOT NULL,
    `massKg` DOUBLE NULL,
    `loadFactor` DOUBLE NULL,
    `refrigerated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ResponseTransport_responseId_idx`(`responseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmissionCalculation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `responseId` INTEGER NOT NULL,
    `itemId` INTEGER NULL,
    `calcRuleVersion` VARCHAR(20) NOT NULL,
    `totalKgco2e` DOUBLE NOT NULL,
    `intensityKgco2ePerUnit` DOUBLE NOT NULL,
    `qualityLabel` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `deviationFlag` BOOLEAN NOT NULL DEFAULT false,
    `deviationPercent` DOUBLE NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmissionCalculation_itemId_key`(`itemId`),
    INDEX `EmissionCalculation_responseId_idx`(`responseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmissionFactor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(50) NOT NULL,
    `unit` VARCHAR(20) NOT NULL,
    `factorKgco2e` DOUBLE NOT NULL,
    `region` VARCHAR(10) NOT NULL DEFAULT '',
    `year` INTEGER NULL,
    `version` VARCHAR(20) NOT NULL,
    `source` VARCHAR(191) NOT NULL,

    INDEX `EmissionFactor_type_idx`(`type`),
    UNIQUE INDEX `EmissionFactor_type_region_year_version_key`(`type`, `region`, `year`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `requestId` INTEGER NOT NULL,
    `oldStatus` VARCHAR(20) NOT NULL,
    `newStatus` VARCHAR(20) NOT NULL,
    `changedBy` VARCHAR(100) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StatusHistory_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `responseId` INTEGER NOT NULL,
    `itemId` INTEGER NULL,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Attachment_responseId_idx`(`responseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SupplierResponse` ADD CONSTRAINT `SupplierResponse_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `SupplierRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseItem` ADD CONSTRAINT `ResponseItem_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SupplierResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ResponseTransport` ADD CONSTRAINT `ResponseTransport_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SupplierResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmissionCalculation` ADD CONSTRAINT `EmissionCalculation_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SupplierResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmissionCalculation` ADD CONSTRAINT `EmissionCalculation_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `ResponseItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusHistory` ADD CONSTRAINT `StatusHistory_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `SupplierRequest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attachment` ADD CONSTRAINT `Attachment_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `SupplierResponse`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
