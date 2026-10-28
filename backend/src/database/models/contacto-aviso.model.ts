import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'contactos_aviso', underscored: true, timestamps: true })
export class ContactoAviso extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare nombre: string;

  @Column({ type: DataType.STRING(120), allowNull: true })
  declare puesto: string | null;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    field: 'pushover_user',
  })
  declare pushoverUser: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
    field: 'pushover_device',
  })
  declare pushoverDevice: string | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  declare sonido: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare activo: boolean;
}
