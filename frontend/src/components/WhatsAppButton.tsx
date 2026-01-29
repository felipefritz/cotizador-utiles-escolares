import { Fab, Tooltip } from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

export function WhatsAppButton() {
  // Número de WhatsApp desde variable de entorno
  // Formato internacional sin + ni espacios (ej: 56912345678 para +56 9 1234 5678)
  const phoneNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '56940126230'
  const message = encodeURIComponent('Hola, tengo una consulta sobre el Cotizador de Útiles Escolares')
  
  const handleClick = () => {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Tooltip title="Contáctanos por WhatsApp" placement="left">
      <Fab
        color="success"
        aria-label="whatsapp"
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: '#25D366',
          color: 'white',
          boxShadow: 3,
          zIndex: 1000,
          '&:hover': {
            bgcolor: '#20BA5A',
            boxShadow: 6,
            transform: 'scale(1.05)',
          },
          transition: 'all 0.3s ease',
          animation: 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%': {
              boxShadow: '0 0 0 0 rgba(37, 211, 102, 0.7)',
            },
            '70%': {
              boxShadow: '0 0 0 10px rgba(37, 211, 102, 0)',
            },
            '100%': {
              boxShadow: '0 0 0 0 rgba(37, 211, 102, 0)',
            },
          },
        }}
      >
        <WhatsAppIcon sx={{ fontSize: 32 }} />
      </Fab>
    </Tooltip>
  )
}
