import React, { useEffect, useState } from 'react';
import {
  Stack,
  Typography
} from '@mui/material';

import { EthDateTimeConverter } from '../ethDateTime';

function CurrentTime() {
  const [value, setValue] = useState(new Date().getTime());

  useEffect(() => {
    const interval = setInterval(() => setValue(new Date().getTime()), 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Stack direction="column">

    <Typography variant="h6" noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
      ETH: {EthDateTimeConverter.getEthiopianDateTimeFromMillis(value).toString()}
      </Typography>
      <Typography  variant="h6" noWrap
            component="div"
            sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
      Local: {new Date(value).toString()}
      </Typography>
    </Stack>
  );
}

export default CurrentTime;