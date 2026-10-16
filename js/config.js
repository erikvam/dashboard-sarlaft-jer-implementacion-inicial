/*
 * CONFIGURACIÓN DEL DASHBOARD
 * Después de desplegar Apps Script con la validación Firebase, pega su URL terminada en /exec en scriptUrl. El acceso a datos se envía por POST, no por JSONP.
 */
const JER_CONFIG = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxvNIqxZ2bJ0FhS7Sx9tj5YvWkL5hWadhP3CGe8yzYBkwvPb5riuO-vTRtw6TSUVDfnMw/exec',
  defaultMonth: 'ALL',
  detailRowsPerPage: 10,

  reportSequence: [
    { type: 'cover' },
    { type: 'activities' },

    { type: 'metric', title: 'MONITOREO DE GIROS BOYACÁ', metrics: [
      { title: 'CANTIDAD DE GIROS ENVIADOS', sheet: 'N. GIROS ENV BOY' },
      { title: 'GIROS ENVIADOS POR PERSONA', sheet: 'N. P GIROS ENV. BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO DE GIROS BOYACÁ', metrics: [
      { title: 'MONTOS DE GIROS ENVIADOS', sheet: 'TOTALES GIROS ENV. BOY' },
      { title: 'CANTIDAD DE GIROS PAGADOS', sheet: 'N. GIROS PAG. BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO DE GIROS BOYACÁ', metrics: [
      { title: 'GIROS PAGADOS POR PERSONA', sheet: 'N. PER GIROS PAG. BOY' },
      { title: 'MONTO DE GIROS PAGADOS', sheet: 'TOTAL GIROS PAG. BOY' }
    ]},
    { type: 'narrative', title: 'MONITOREO DE TRANSACCIONES DE GIROS BOYACÁ', text: 'Durante el período evaluado, el sistema de monitoreo transaccional evaluó las operaciones del departamento de Boyacá. El resultado del monitoreo y las alertas generadas debe ser revisado por la Oficial de Cumplimiento conforme a las políticas SARLAFT vigentes.' },

    { type: 'metric', title: 'MONITOREO DE GIROS AMAZONAS', metrics: [
      { title: 'CANTIDAD DE GIROS ENVIADOS', sheet: ' N. GIROS ENV AMZ' },
      { title: 'GIROS ENVIADOS POR PERSONA', sheet: 'N. P GIROS ENV. AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO DE GIROS AMAZONAS', metrics: [
      { title: 'MONTOS DE GIROS ENVIADOS', sheet: 'TOTALES GIROS ENV. AMZ' },
      { title: 'CANTIDAD DE GIROS PAGADOS', sheet: 'N. GIROS PAG. AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO DE GIROS AMAZONAS', metrics: [
      { title: 'GIROS PAGADOS POR PERSONA', sheet: 'N. PER GIROS PAG. AMZ' },
      { title: 'MONTO DE GIROS PAGADOS', sheet: 'TOTAL GIROS PAG. AMZ' }
    ]},
    { type: 'narrative', title: 'MONITOREO DE TRANSACCIONES DE GIROS AMAZONAS', text: 'Durante el período evaluado, el sistema de monitoreo transaccional evaluó las operaciones del departamento de Amazonas. El resultado del monitoreo y las alertas generadas debe ser revisado por la Oficial de Cumplimiento conforme a las políticas SARLAFT vigentes.' },

    { type: 'metric', title: 'MONITOREO BETPLAY BOYACÁ', metrics: [
      { title: 'CANTIDAD DE RECARGAS', sheet: 'CANT RECARGAS BETPLAY BOY' },
      { title: 'RECARGAS POR PERSONA', sheet: 'N PERSONAS RECARGAS BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO BETPLAY BOYACÁ', metrics: [
      { title: 'MONTOS DE RECARGAS', sheet: 'MONTOS RECARGAS BOY' },
      { title: 'CANTIDAD DE RETIROS BETPLAY', sheet: 'CANT RETIROS BETPLAY BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO BETPLAY BOYACÁ', metrics: [
      { title: 'RETIROS POR PERSONA', sheet: 'N PERSONAS RETIROS BOY' },
      { title: 'MONTO DE RETIROS', sheet: 'MONTOS RETIROS BOY' }
    ]},
    { type: 'narrative', title: 'MONITOREO DE TRANSACCIONES DE BETPLAY BOYACÁ', text: 'Se realiza monitoreo de recargas y retiros de Betplay conforme a la política de monitoreo transaccional de la organización. Las operaciones que superen los umbrales definidos deben ser objeto de análisis y seguimiento, de acuerdo con los procedimientos internos vigentes.' },

    { type: 'metric', title: 'MONITOREO BETPLAY AMAZONAS', metrics: [
      { title: 'CANTIDAD DE RECARGAS', sheet: 'CANT RECARGAS BETPLAY AMZ' },
      { title: 'RECARGAS POR PERSONA', sheet: 'N PERSONAS RECARGAS AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO BETPLAY AMAZONAS', metrics: [
      { title: 'MONTOS DE RECARGAS', sheet: 'MONTOS RECARGAS AMZ' },
      { title: 'CANTIDAD DE RETIROS BETPLAY', sheet: 'CANT RETIROS BETPLAY AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO BETPLAY AMAZONAS', metrics: [
      { title: 'RETIROS POR PERSONA', sheet: 'N PERSONAS RETIROS AMZ' },
      { title: 'MONTO DE RETIROS', sheet: 'MONTOS RETIROS AMZ' }
    ]},
    { type: 'narrative', title: 'MONITOREO DE TRANSACCIONES DE BETPLAY AMAZONAS', text: 'Se realiza monitoreo de recargas y retiros de Betplay conforme a la política de monitoreo transaccional de la organización. Las operaciones que superen los umbrales definidos deben ser objeto de análisis y seguimiento, de acuerdo con los procedimientos internos vigentes.' },

    { type: 'metric', title: 'MONITOREO DE PREMIOS BOYACÁ', metrics: [
      { title: 'CANTIDAD DE PREMIOS CHANCE', sheet: 'CANT PREMIOS CHANCE BOY' },
      { title: 'PREMIOS CHANCE POR PERSONA', sheet: 'N. PERSONAS PREMIOS CHANCE BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO DE PREMIOS BOYACÁ', metrics: [
      { title: 'MONTOS DE PREMIOS CHANCE PAGADOS', sheet: ' MONTOS TOTALES PREMIOS CHANCE ' },
      { title: 'CANTIDAD DE PREMIOS INSTANTÁNEAS PAGADOS', sheet: 'CANT. INSTANT-BOY' }
    ]},
    { type: 'metric', title: 'MONITOREO DE PREMIOS BOYACÁ', metrics: [
      { title: 'PREMIOS INSTANTÁNEAS POR PERSONA', sheet: 'N. PERSONAS INSTANT BOY.' },
      { title: 'MONTO DE PREMIOS INSTANTÁNEAS', sheet: 'MONTOS INSTANT. BOY' }
    ]},
    { type: 'narrative', title: 'MONITOREO PAGO DE PREMIOS BOYACÁ', text: 'Como medida de prevención, se recuerda a la fuerza de venta la importancia de cumplir las políticas y controles aplicables al cobro de premios. Las operaciones revisadas deben mantenerse dentro de los criterios definidos y escalarse cuando corresponda.' },

    { type: 'metric', title: 'MONITOREO DE PREMIOS AMAZONAS', metrics: [
      { title: 'CANTIDAD DE PREMIOS CHANCE', sheet: 'CANT PREMIOS CHANCE AMZ' },
      { title: 'PREMIOS CHANCE POR PERSONA', sheet: 'N. PERSONAS PREMIOS CHANCE AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO DE PREMIOS AMAZONAS', metrics: [
      { title: 'MONTOS DE PREMIOS CHANCE PAGADOS', sheet: 'MONTOS TOTALES PREMIOS CHANCE A' },
      { title: 'CANTIDAD DE PREMIOS INSTANTÁNEAS PAGADOS', sheet: 'CANT. INSTANT AMZ' }
    ]},
    { type: 'metric', title: 'MONITOREO DE PREMIOS AMAZONAS', metrics: [
      { title: 'PREMIOS INSTANTÁNEAS POR PERSONA', sheet: 'N. PERSONAS INSTANT AMZ.' },
      { title: 'MONTO DE PREMIOS INSTANTÁNEAS', sheet: 'MONTOS INSTANT. AMZ' }
    ]},
    { type: 'narrative', title: 'MONITOREO PAGO DE PREMIOS AMAZONAS', text: 'Como medida de prevención, se recuerda a la fuerza de venta la importancia de cumplir las políticas y controles aplicables al cobro de premios. Las operaciones revisadas deben mantenerse dentro de los criterios definidos y escalarse cuando corresponda.' },

    { type: 'pairedTables', title: 'OPERACIONES INUSUALES · OPERACIONES SOSPECHOSAS', cards: [
      { title: 'REPORTES ROS', sheet: 'ROS' }, { title: 'OPERACIONES INUSUALES DE GIROS', sheet: 'ROI' }
    ]},
    { type: 'cnjsa', title: 'REPORTE A ENTES DE CONTROL', sheet: 'CNJSA' },
    { type: 'dueDiligence', title: 'DEBIDA DILIGENCIA EN LA VERIFICACIÓN DE TERCEROS', sheet: 'DEBIDA DILIGENCIA' },
    { type: 'metric', title: 'DEBIDA DILIGENCIA EN LA VERIFICACIÓN DE TERCEROS', metrics: [
      { title: 'PEP Y EXTRANJEROS', sheet: 'PEP EXT', displayIndices: [1, 2, 3], primaryIndex: 2, secondaryIndex: 3 }
    ]},
    { type: 'trainingDashboard', title: 'CAPACITACIONES E INDUCCIONES', capSheet: 'CAPACITACIONES', inductionSheet: 'INDUCCIONES' },
    { type: 'detail', title: 'FORMACIÓN Y ACTUALIZACIÓN DE COMPETENCIAS', sheet: 'formacion oc', tableTitle: 'FORMACIÓN OFICIAL DE CUMPLIMIENTO' },
    { type: 'detailPair', title: 'FORMACIÓN Y ACTUALIZACIÓN DE COMPETENCIAS', sheets: [
      { sheet: 'CAPACITACIONES JER', title: 'CAPACITACIONES JER' }
    ]},
    { type: 'detail', title: 'OTRAS ACTIVIDADES', sheet: 'otras act', tableTitle: 'OTRAS ACTIVIDADES' },
    { type: 'detail', title: 'REUNIONES', sheet: 'REUNIONES', tableTitle: 'REUNIONES' },
    { type: 'closing' }
  ],

  activities: [
    'Monitoreo de transacciones de giros, cobro de premios de chance e instantáneas, recargas y retiros de Betplay.',
    'Reportes mensuales a entes de control.',
    'Debida diligencia en la verificación de terceros.',
    'Plan de capacitación e inducción en la prevención del LA/FT-PADM.',
    'Formación y actualización de competencias.',
    'Otras actividades.',
    'Reuniones.'
  ]
};
