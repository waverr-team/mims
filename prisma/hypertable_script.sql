CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS timescaledb_toolkit CASCADE;

-- CreateHyperTable
SELECT create_hypertable('market_data', 'date');

-- DropIndex
DROP INDEX "market_data_date_idx";

-- CreateHyperTable
SELECT create_hypertable('prediction', 'date');

-- DropIndex
DROP INDEX "prediction_date_idx";
