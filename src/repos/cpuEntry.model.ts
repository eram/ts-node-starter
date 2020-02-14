import { Table, Column, Model, Repository, PrimaryKey, AutoIncrement } from 'sequelize-typescript';


@Table({
  timestamps: true,
  comment: 'CpuEntries table'
})
class CpuEntry extends Model<CpuEntry> {

  @PrimaryKey @AutoIncrement @Column
  public id: number;

  @Column
  public cpu!: number;
}

// eslint-disable-next-line @typescript-eslint/no-type-alias
type CpuHistoryRepo = Repository<CpuEntry>;
export { CpuHistoryRepo, CpuEntry };
