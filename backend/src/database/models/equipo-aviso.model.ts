import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'equipos_aviso', underscored: true, timestamps: true })
export class EquipoAviso extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  // Parte de la dirección de su tableta: /tableta/<slug>
  @Column({ type: DataType.STRING(40), allowNull: false, unique: true })
  declare slug: string;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare nombre: string;

  // Quién llama; firma las alertas de su tableta.
  @Column({ type: DataType.STRING(120), allowNull: false })
  declare encargado: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare orden: number;
}
