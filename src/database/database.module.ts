import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, type DataSourceOptions } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        ssl: true,
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
      // Synchronize only once the extensions the schema relies on exist
      dataSourceFactory: async (options?: DataSourceOptions) => {
        const dataSource = new DataSource({ ...options!, synchronize: false });
        await dataSource.initialize();
        // The booking overlap constraint mixes uuid equality with range overlap in one GiST index
        await dataSource.query('CREATE EXTENSION IF NOT EXISTS btree_gist');
        if (options?.synchronize) await dataSource.synchronize();
        return dataSource;
      },
    }),
  ],
})
export class DatabaseModule {}
