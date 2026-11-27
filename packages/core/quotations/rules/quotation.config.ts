// D-42: the device models counted as N in the installation time standard (D-40: partial N + 2 h, full 2N + 2 h per
// store). Edge terminals (CBox) are installed with the sensors and are not counted.
export const quotationRule = {
  hoursCountModels: ['G6', 'G6S', 'G6 WiFi', 'B1'],
} as const;
