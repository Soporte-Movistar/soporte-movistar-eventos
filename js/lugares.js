/* Lugares oficiales por región (español de los juegos — localización española) */
window.LUGARES_REGIONES = (function () {
  const rangos = (nombre, desde, hasta) => {
    const arr = [];
    for (let i = desde; i <= hasta; i++) arr.push(nombre + ' ' + i);
    return arr;
  };

  return {
    'Kanto': {
      etiqueta: 'Kanto',
      ciudades: [
        'Pueblo Paleta', 'Ciudad Verde', 'Ciudad Plateada', 'Ciudad Celeste',
        'Ciudad Carmín', 'Pueblo Lavanda', 'Ciudad Azulona', 'Ciudad Azafrán',
        'Ciudad Fucsia'
      ],
      islas: [
        'Isla Prima', 'Isla Secunda', 'Isla Tera', 'Isla Quarta',
        'Isla Inta', 'Isla Exta', 'Isla Sétima', 'Roca Ombligo', 'Isla Origen'
      ],
      rutas: rangos('Ruta', 1, 25),
      destacados: [
        'Meseta Añil', 'Calle Victoria', 'Monte Luna', 'Isla Canela',
        'Bosque Baya', 'Bosquejo', 'Monte Ascuas', 'Ruinas Sete', 'Pilar Recuerdo', 'Torre Desafío'
      ]
    },
    'Johto': {
      etiqueta: 'Johto',
      ciudades: [
        'Pueblo Primavera', 'Ciudad Cerezo', 'Ciudad Malva', 'Pueblo Azalea',
        'Ciudad Trigal', 'Ciudad Iris', 'Ciudad Orquídea', 'Ciudad Olivo',
        'Pueblo Caoba', 'Ciudad Endrino'
      ],
      rutas: rangos('Ruta', 28, 48),
      destacados: ['Meseta Añil', 'Monte Plateado', 'Torre Quemada', 'Encinar', 'Parque Nacional', 'Islas Remolino']
    },
    'Hoenn': {
      etiqueta: 'Hoenn',
      ciudades: [
        'Pueblo Raíz Chica', 'Pueblo Escaso', 'Ciudad Petalia', 'Ciudad Férrica',
        'Ciudad Portual', 'Ciudad Malvalona', 'Pueblo Azuliza', 'Pueblo Verdegal',
        'Pueblo Pardal', 'Pueblo Lavacalda', 'Ciudad Arborada', 'Ciudad Algaria',
        'Ciudad Calagua', 'Arrecípolis', 'Pueblo Oromar'
      ],
      rutas: rangos('Ruta', 101, 134),
      destacados: ['Liga Pokémon', 'Calle Victoria', 'Cueva Insular', 'Torre de Batalla', 'Camino de bicis', 'Zona Safari']
    },
    'Sinnoh': {
      etiqueta: 'Sinnoh',
      ciudades: [
        'Pueblo Hojaverde', 'Pueblo Arena', 'Ciudad Jubileo', 'Ciudad Pirita',
        'Pueblo Aromaflor', 'Ciudad Vetusta', 'Ciudad Corazón', 'Pueblo Sosiego',
        'Ciudad Rocavelo', 'Ciudad Pradera', 'Pueblo Caelestis', 'Ciudad Canal',
        'Ciudad Puntaneva', 'Ciudad Marina'
      ],
      rutas: rangos('Ruta', 201, 230),
      destacados: ['Liga Pokémon', 'Calle Victoria', 'Monte Corona', 'Templo Puntaneva', 'Torre de Batalla', 'Lago Veraz']
    },
    'Teselia (Unova)': {
      etiqueta: 'Teselia (Unova)',
      ciudades: [
        'Pueblo Arcilla', 'Pueblo Terracota', 'Ciudad Gres', 'Ciudad Esmalte',
        'Ciudad Porcelana', 'Ciudad Mayólica', 'Ciudad Fayenza', 'Ciudad Loza',
        'Ciudad Teja', 'Pueblo Biscuit', 'Ciudad Caolín', 'Pueblo Ladrillo',
        'Pueblo Arenisca'
      ],
      rutas: rangos('Ruta', 1, 23),
      destacados: ['Liga Pokémon', 'Calle Victoria', 'Monte Tuerca', 'Torre Dracoespiral', 'Isla Libertad']
    }
  };
})();