import type { ThemeConfig } from 'antd';

const tokens = {
  colorPrimary: '#0B8F68',
  colorBgLayout: '#ECEFEF',
  colorBgContainer: '#FFFFFF',
  colorText: '#17211D',
  colorTextSecondary: '#65716B',
  colorBorder: '#D5DDDA',
  fontFamily: 'Inter, sans-serif',
  radius: { small: 8, medium: 14, large: 20 },
  controlHeight: 44,
} as const;

export const rentPayAntTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.colorPrimary,
    colorBgLayout: tokens.colorBgLayout,
    colorBgContainer: tokens.colorBgContainer,
    colorText: tokens.colorText,
    colorTextSecondary: tokens.colorTextSecondary,
    colorBorder: tokens.colorBorder,
    borderRadius: tokens.radius.medium,
    fontFamily: tokens.fontFamily,
  },
  components: {
    Button: { controlHeight: tokens.controlHeight, borderRadius: tokens.radius.medium, fontWeight: 600 },
    Input: { controlHeight: tokens.controlHeight, borderRadius: tokens.radius.small },
    Select: { controlHeight: tokens.controlHeight, borderRadius: tokens.radius.small },
    DatePicker: { controlHeight: tokens.controlHeight, borderRadius: tokens.radius.small },
    Card: { borderRadiusLG: tokens.radius.large },
    Modal: { borderRadiusLG: tokens.radius.large },
    Drawer: { borderRadiusLG: tokens.radius.large },
    Table: { headerBg: tokens.colorBgLayout, borderColor: tokens.colorBorder },
    Tabs: { itemSelectedColor: tokens.colorPrimary },
    Tag: { borderRadiusSM: tokens.radius.small },
    Alert: { borderRadiusLG: tokens.radius.medium },
    Pagination: { itemSize: tokens.controlHeight },
  },
};
