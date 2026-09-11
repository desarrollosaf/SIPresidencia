import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'usuarios', underscored: true, timestamps: true })
export class Usuario extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(150), allowNull: false, unique: true })
  declare email: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    field: 'password_hash',
  })
  declare passwordHash: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    defaultValue: 'operador',
  })
  declare rol: string;
}
