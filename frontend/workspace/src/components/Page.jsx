export default function Page() {
  return <BuildATwitterWeb />;
}
```

```tsx frontend/app/components/BuildATwitterWeb.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './BuildATwitterWeb.module.css';

// Mock data for tweets. In a real app, this would come from an API.
