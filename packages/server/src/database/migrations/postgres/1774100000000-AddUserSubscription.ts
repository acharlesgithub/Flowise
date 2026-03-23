import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddUserSubscription1774100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS user_subscription (
                id uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clerkUserId" varchar NOT NULL,
                "stripeCustomerId" varchar,
                "stripeSubscriptionId" varchar,
                "stripeProductId" varchar,
                plan varchar(20) NOT NULL DEFAULT 'NONE',
                status varchar(50) NOT NULL DEFAULT 'none',
                "trialEnd" timestamp,
                "currentPeriodEnd" timestamp,
                "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
                "createdDate" timestamp NOT NULL DEFAULT now(),
                "updatedDate" timestamp NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_subscription" PRIMARY KEY (id),
                CONSTRAINT "UQ_user_subscription_clerkUserId" UNIQUE ("clerkUserId")
            );
        `)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_user_subscription_clerkUserId" ON user_subscription ("clerkUserId");`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS user_subscription`)
    }
}
