import * as dotenv from 'dotenv';
import * as envalid from 'envalid';

dotenv.config();

const env = envalid.cleanEnv(process.env, {
	MIMS_PORT: envalid.port(),
	MIMS_HOST: envalid.host(),
	NODE_ENV: envalid.str({ choices: ['development', 'production'] }),
	TIMESCALE_URL: envalid.url(),
});

export default env;
