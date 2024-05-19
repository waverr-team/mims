CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit CASCADE;

-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "pairId" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_pkey" PRIMARY KEY ("id","date")
);

-- CreateTable
CREATE TABLE "prediction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP NOT NULL,
    "predictionDate" TIMESTAMP NOT NULL,
    "fromId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modelVersion" TEXT NOT NULL,

    CONSTRAINT "prediction_pkey" PRIMARY KEY ("id","date")
);

-- CreateHyperTable
SELECT create_hypertable('market_data', 'date');

-- DropIndex
DROP INDEX "market_data_date_idx";

-- CreateHyperTable
SELECT create_hypertable('prediction', 'date');

-- DropIndex
DROP INDEX "prediction_date_idx";

-- CreateTable
CREATE TABLE "pair" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brokerId" TEXT NOT NULL,
    "ranges" JSONB[],

    CONSTRAINT "pair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "broker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_data_pairId_date_key" ON "market_data"("pairId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "prediction_fromId_date_key" ON "prediction"("fromId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pair_base_quote_brokerId_key" ON "pair"("base", "quote", "brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "broker_name_key" ON "broker"("name");

-- AddForeignKey
ALTER TABLE "market_data" ADD CONSTRAINT "market_data_pairId_fkey" FOREIGN KEY ("pairId") REFERENCES "pair"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_fromId_date_fkey" FOREIGN KEY ("fromId", "date") REFERENCES "market_data"("id", "date") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pair" ADD CONSTRAINT "pair_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
