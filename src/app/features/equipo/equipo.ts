import { Component, ElementRef, computed, signal, viewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactoAviso, ContactoForm, EquipoAviso } from '../../core/services/avisos.service';
import { AvisosBase, mensajeDeError } from '../../shared/avisos/avisos-base';

export const SONIDOS = [
  { valor: '', etiqueta: 'El del sistema' },
  { valor: 'vibrate', etiqueta: 'Solo vibración' },
  { valor: 'persistent', etiqueta: 'Persistente (largo)' },
  { valor: 'siren', etiqueta: 'Sirena' },
  { valor: 'spacealarm', etiqueta: 'Alarma' },
  { valor: 'echo', etiqueta: 'Eco' },
  { valor: 'bugle', etiqueta: 'Corneta' },
  { valor: 'pushover', etiqueta: 'Pushover' },
];

// Vista "Equipo de trabajo": además de avisar, da de alta, edita y quita personas.
@Component({
  selector: 'app-equipo',
  templateUrl: './equipo.html',
})
export class EquipoTrabajo extends AvisosBase {
  protected readonly sonidos = SONIDOS;

  // Formulario de alta / edición
  protected readonly formAbierto = signal(false);
  protected readonly editando = signal<ContactoAviso | null>(null);
  protected readonly form = signal<ContactoForm>({ nombre: '', pushoverUser: '' });
  protected readonly guardando = signal(false);
  protected readonly porEliminar = signal<ContactoAviso | null>(null);
  // Nombres dados de alta sin cerrar el formulario ("Guardar y agregar otra").
  protected readonly agregados = signal<string[]>([]);
  private readonly campoNombre = viewChild<ElementRef<HTMLInputElement>>('campoNombre');

  constructor() {
    super();
    // Si antes se abrió la tableta, aquí se vuelve a usar la sesión.
    this.avisosService.usarTableta(false);
  }

  protected readonly tieneOpcionales = computed(() => {
    const f = this.form();
    return !!(f.puesto || f.pushoverDevice || f.sonido);
  });

  // Personas agrupadas por equipo (en el orden de los equipos); al final las que no tienen.
  protected readonly grupos = computed(() => {
    const grupos: { clave: string; equipo: EquipoAviso | null; personas: ContactoAviso[] }[] =
      this.equipos().map((e) => ({
        clave: e.slug,
        equipo: e,
        personas: this.contactos().filter((c) => c.equipoId === e.id),
      }));
    const ids = new Set(this.equipos().map((e) => e.id));
    const sinEquipo = this.contactos().filter((c) => c.equipoId === null || !ids.has(c.equipoId));
    if (sinEquipo.length) grupos.push({ clave: 'sin-equipo', equipo: null, personas: sinEquipo });
    return grupos;
  });

  protected abrirNuevo(equipoId: number | null = null): void {
    this.editando.set(null);
    this.agregados.set([]);
    this.limpiarForm(equipoId);
    this.formAbierto.set(true);
    this.enfocarNombre();
  }

  protected elegirEquipo(id: number): void {
    this.form.update((f) => ({ ...f, equipoId: id }));
  }

  protected abrirEditar(contacto: ContactoAviso): void {
    this.editando.set(contacto);
    this.form.set({
      nombre: contacto.nombre,
      puesto: contacto.puesto ?? '',
      pushoverUser: contacto.pushoverUser,
      pushoverDevice: contacto.pushoverDevice ?? '',
      sonido: contacto.sonido ?? '',
      activo: contacto.activo,
      equipoId: contacto.equipoId,
    });
    this.formAbierto.set(true);
  }

  protected cerrarForm(): void {
    if (!this.guardando()) this.formAbierto.set(false);
  }

  protected campo(nombre: keyof ContactoForm, evento: Event): void {
    const el = evento.target as HTMLInputElement;
    const valor = el.type === 'checkbox' ? el.checked : el.value;
    this.form.update((f) => ({ ...f, [nombre]: valor }));
  }

  protected guardar(evento: Event): void {
    evento.preventDefault();
    // El botón "Guardar y agregar otra" deja el formulario abierto y vacío para la siguiente persona.
    const seguir = (evento as SubmitEvent).submitter?.dataset['seguir'] === '1';
    const datos = {
      ...this.form(),
      nombre: this.form().nombre.trim(),
      pushoverUser: this.form().pushoverUser.trim(),
    };
    const editando = this.editando();
    if (!datos.equipoId) {
      this.toastService.error('Elige de qué equipo es.');
      return;
    }
    this.guardando.set(true);

    const peticion: Observable<{ ok?: boolean; dispositivos?: string[] }> = editando
      ? this.avisosService.actualizar(editando.id, datos)
      : this.avisosService.crear(datos);

    peticion.subscribe({
      next: (r) => {
        this.guardando.set(false);
        const dispositivos = r.dispositivos ?? [];
        this.toastService.success(
          editando
            ? `Se guardaron los cambios de ${datos.nombre}.`
            : `${datos.nombre} quedó registrado${dispositivos.length ? ` (${dispositivos.join(', ')})` : ''}.`,
        );
        if (seguir) {
          this.agregados.update((a) => [...a, datos.nombre]);
          // La siguiente persona suele ser del mismo equipo: se deja elegido.
          this.limpiarForm(datos.equipoId);
          this.enfocarNombre();
        } else {
          this.formAbierto.set(false);
        }
        this.cargarContactos();
      },
      error: (e) => {
        this.guardando.set(false);
        this.toastService.error(mensajeDeError(e, 'No se pudo guardar.'));
      },
    });
  }

  protected pedirEliminar(contacto: ContactoAviso): void {
    this.porEliminar.set(contacto);
  }

  protected confirmarEliminar(): void {
    const contacto = this.porEliminar();
    if (!contacto) return;
    this.avisosService.eliminar(contacto.id).subscribe({
      next: () => {
        this.porEliminar.set(null);
        this.toastService.info(`${contacto.nombre} se quitó del equipo.`);
        this.cargarContactos();
      },
      error: (e) => this.toastService.error(mensajeDeError(e, 'No se pudo eliminar.')),
    });
  }

  private limpiarForm(equipoId: number | null = null): void {
    this.form.set({
      nombre: '',
      puesto: '',
      pushoverUser: '',
      pushoverDevice: '',
      sonido: '',
      equipoId,
    });
  }

  private enfocarNombre(): void {
    setTimeout(() => this.campoNombre()?.nativeElement.focus());
  }
}
