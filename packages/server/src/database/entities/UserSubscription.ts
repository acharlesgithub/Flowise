/* eslint-disable */
import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryGeneratedColumn, Index } from 'typeorm'

@Entity('user_subscription')
export class UserSubscription {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ unique: true })
    @Index()
    clerkUserId: string

    @Column({ nullable: true })
    stripeCustomerId: string

    @Column({ nullable: true })
    stripeSubscriptionId: string

    @Column({ nullable: true })
    stripeProductId: string

    @Column({ type: 'varchar', length: 20, default: 'NONE' })
    plan: string

    @Column({ type: 'varchar', length: 50, default: 'none' })
    status: string

    @Column({ type: 'timestamp', nullable: true })
    trialEnd: Date

    @Column({ type: 'timestamp', nullable: true })
    currentPeriodEnd: Date

    @Column({ type: 'boolean', default: false })
    cancelAtPeriodEnd: boolean

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}
