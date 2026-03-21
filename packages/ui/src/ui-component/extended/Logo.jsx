import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <span
                style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: customization.isDarkMode ? '#fff' : '#1a1a2e',
                    fontFamily: 'Inter, sans-serif',
                    letterSpacing: '-0.02em'
                }}
            >
                VoxScribe
            </span>
        </div>
    )
}

export default Logo
