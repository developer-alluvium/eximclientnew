// Premium Light Theme Configuration for Ant Design
// Clean, Trust-inspiring, Professional Design System

export const antdTheme = {
  token: {
    // Primary Blue - Professional & Trustworthy
    colorPrimary: "#1890ff",
    colorPrimaryHover: "#40a9ff",
    colorPrimaryActive: "#096dd9",
    colorPrimaryBg: "#e6f7ff",
    colorPrimaryBgHover: "#bae7ff",

    // Success - Growth & Progress
    colorSuccess: "#52c41a",
    colorSuccessBg: "#f6ffed",

    // Warning - Attention
    colorWarning: "#faad14",
    colorWarningBg: "#fffbe6",

    // Error - Critical
    colorError: "#ff4d4f",
    colorErrorBg: "#fff2f0",

    // Info
    colorInfo: "#1890ff",

    // Text Colors - Clean Light Theme
    colorText: "#262626",
    colorTextSecondary: "#595959",
    colorTextTertiary: "#8c8c8c",
    colorTextQuaternary: "#bfbfbf",

    // Background Colors
    colorBgContainer: "#ffffff",
    colorBgElevated: "#ffffff",
    colorBgLayout: "#f5f7fa",
    colorBgSpotlight: "#ffffff",
    colorBgMask: "rgba(0, 0, 0, 0.45)",

    // Border Colors
    colorBorder: "#e8e8e8",
    colorBorderSecondary: "#f0f0f0",

    // Fill Colors
    colorFill: "rgba(0, 0, 0, 0.04)",
    colorFillSecondary: "rgba(0, 0, 0, 0.06)",
    colorFillTertiary: "rgba(0, 0, 0, 0.02)",

    // Typography
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // Line Heights
    lineHeight: 1.5714285714,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6666666667,

    // Border Radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Spacing (in pixels)
    padding: 16,
    paddingLG: 24,
    paddingMD: 20,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginMD: 20,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // Control Sizes
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,

    // Box Shadows
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    boxShadowSecondary: "0 4px 12px rgba(0, 0, 0, 0.12)",
    boxShadowTertiary: "0 1px 2px rgba(0, 0, 0, 0.03)",

    // Motion
    motionDurationFast: "0.1s",
    motionDurationMid: "0.2s",
    motionDurationSlow: "0.3s",
    motionEaseInOut: "cubic-bezier(0.645, 0.045, 0.355, 1)",
    motionEaseOut: "cubic-bezier(0.215, 0.61, 0.355, 1)",
    motionEaseIn: "cubic-bezier(0.55, 0.055, 0.675, 0.19)",

    // Link
    colorLink: "#1890ff",
    colorLinkHover: "#40a9ff",
    colorLinkActive: "#096dd9",

    // Wire frame
    wireframe: false,
  },

  components: {
    Layout: {
      colorBgHeader: "#ffffff",
      colorBgBody: "#f5f7fa",
      colorBgTrigger: "#002140",
      headerHeight: 64,
      headerPadding: "0 24px",
      headerColor: "#262626",
    },

    Menu: {
      itemBg: "transparent",
      itemColor: "#595959",
      itemHoverColor: "#1890ff",
      itemHoverBg: "#e6f7ff",
      itemSelectedColor: "#1890ff",
      itemSelectedBg: "#e6f7ff",
      horizontalItemSelectedColor: "#1890ff",
      horizontalItemSelectedBg: "transparent",
      itemActiveBg: "#e6f7ff",
      subMenuItemBg: "#ffffff",
      itemBorderRadius: 6,
      iconSize: 16,
      collapsedIconSize: 18,
      darkItemColor: "rgba(255, 255, 255, 0.65)",
      darkItemHoverColor: "#fff",
      darkItemSelectedColor: "#fff",
      darkItemSelectedBg: "#1890ff",
    },

    Card: {
      colorBgContainer: "#ffffff",
      colorBorderSecondary: "#f0f0f0",
      borderRadiusLG: 12,
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      paddingLG: 24,
    },

    Button: {
      colorPrimary: "#1890ff",
      colorPrimaryHover: "#40a9ff",
      colorPrimaryActive: "#096dd9",
      borderRadius: 6,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingContentHorizontal: 20,
      fontWeight: 500,
    },

    Input: {
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      borderRadius: 6,
      controlHeight: 40,
      controlHeightLG: 48,
      controlHeightSM: 32,
      paddingInline: 12,
      activeBorderColor: "#1890ff",
      hoverBorderColor: "#40a9ff",
      activeShadow: "0 0 0 2px rgba(24, 144, 255, 0.2)",
    },

    Select: {
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      borderRadius: 6,
      controlHeight: 40,
      controlItemBgActive: "#e6f7ff",
      controlItemBgHover: "#f5f5f5",
      optionSelectedBg: "#e6f7ff",
      optionSelectedColor: "#1890ff",
    },

    Table: {
      colorBgContainer: "#ffffff",
      headerBg: "#fafafa",
      headerColor: "#262626",
      headerSortActiveBg: "#f0f0f0",
      headerSortHoverBg: "#f0f0f0",
      bodySortBg: "#fafafa",
      rowHoverBg: "#fafafa",
      rowSelectedBg: "#e6f7ff",
      rowSelectedHoverBg: "#bae7ff",
      borderColor: "#f0f0f0",
      headerBorderRadius: 8,
      cellPaddingBlock: 16,
      cellPaddingInline: 16,
      cellFontSize: 14,
      headerFontWeight: 600,
    },

    Modal: {
      colorBgElevated: "#ffffff",
      borderRadiusLG: 12,
      boxShadow:
        "0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)",
      contentBg: "#ffffff",
      headerBg: "#ffffff",
      titleFontSize: 18,
      titleLineHeight: 1.5,
    },

    Drawer: {
      colorBgElevated: "#ffffff",
      colorBgMask: "rgba(0, 0, 0, 0.45)",
      footerPaddingBlock: 12,
      footerPaddingInline: 24,
    },

    Tabs: {
      itemColor: "#595959",
      itemHoverColor: "#1890ff",
      itemSelectedColor: "#1890ff",
      itemActiveColor: "#1890ff",
      inkBarColor: "#1890ff",
      horizontalItemPadding: "12px 16px",
      horizontalMargin: "0 0 16px 0",
      cardBg: "#fafafa",
      cardHeight: 40,
      cardPadding: "8px 16px",
      titleFontSize: 14,
      titleFontSizeLG: 16,
    },

    Tag: {
      defaultBg: "#fafafa",
      defaultColor: "#595959",
    },

    Badge: {
      colorBgContainer: "#ffffff",
      colorBorderBg: "#ffffff",
      textFontSize: 12,
      textFontSizeSM: 10,
      statusSize: 6,
    },

    Avatar: {
      colorBgContainer: "#ffffff",
      borderRadius: 6,
      groupOverlapping: -8,
    },

    Tooltip: {
      colorBgSpotlight: "rgba(0, 0, 0, 0.85)",
      colorTextLightSolid: "#ffffff",
      borderRadius: 6,
    },

    Alert: {
      borderRadiusLG: 8,
      withDescriptionIconSize: 24,
      withDescriptionPadding: "16px 20px",
    },

    Message: {
      contentBg: "#ffffff",
      borderRadiusLG: 8,
    },

    Notification: {
      colorBgElevated: "#ffffff",
      borderRadiusLG: 8,
      width: 384,
    },

    Dropdown: {
      colorBgElevated: "#ffffff",
      borderRadiusLG: 8,
      controlItemBgActive: "#e6f7ff",
      controlItemBgHover: "#f5f5f5",
      paddingBlock: 8,
    },

    Breadcrumb: {
      itemColor: "#595959",
      lastItemColor: "#262626",
      linkColor: "#595959",
      linkHoverColor: "#1890ff",
      separatorColor: "#bfbfbf",
    },

    Pagination: {
      colorPrimary: "#1890ff",
      colorPrimaryHover: "#40a9ff",
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      borderRadius: 6,
      itemActiveBg: "#ffffff",
      itemSize: 32,
      itemSizeSM: 24,
    },

    Steps: {
      colorPrimary: "#1890ff",
      colorTextDescription: "#8c8c8c",
      customIconSize: 32,
      customIconFontSize: 24,
      iconSize: 32,
      iconFontSize: 14,
      dotSize: 8,
    },

    Form: {
      labelColor: "#262626",
      labelColonMarginInlineEnd: 8,
      labelFontSize: 14,
      itemMarginBottom: 24,
      verticalLabelPadding: "0 0 8px",
    },

    Divider: {
      colorSplit: "#f0f0f0",
      colorText: "#262626",
      colorTextHeading: "#262626",
      orientationMargin: 0.05,
      textPaddingInline: 16,
      verticalMarginInline: 8,
    },

    Spin: {
      colorPrimary: "#1890ff",
      dotSize: 20,
      dotSizeSM: 14,
      dotSizeLG: 32,
    },

    Progress: {
      colorText: "#262626",
      remainingColor: "rgba(0, 0, 0, 0.04)",
      lineBorderRadius: 100,
      defaultColor: "#1890ff",
    },

    Switch: {
      colorPrimary: "#1890ff",
      colorPrimaryHover: "#40a9ff",
      colorTextQuaternary: "rgba(0, 0, 0, 0.25)",
      colorTextTertiary: "rgba(0, 0, 0, 0.45)",
      handleBg: "#ffffff",
      handleSize: 18,
      handleSizeSM: 12,
      innerMaxMargin: 24,
      innerMinMargin: 9,
      trackHeight: 22,
      trackHeightSM: 16,
      trackMinWidth: 44,
      trackMinWidthSM: 28,
      trackPadding: 2,
    },

    Checkbox: {
      colorPrimary: "#1890ff",
      colorPrimaryHover: "#40a9ff",
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      borderRadiusSM: 4,
      controlInteractiveSize: 16,
    },

    Radio: {
      colorPrimary: "#1890ff",
      colorPrimaryHover: "#40a9ff",
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      dotSize: 8,
      radioSize: 16,
      wrapperMarginInlineEnd: 8,
    },

    DatePicker: {
      colorBgContainer: "#ffffff",
      colorBgElevated: "#ffffff",
      colorBorder: "#d9d9d9",
      borderRadius: 6,
      controlHeight: 40,
      cellHeight: 24,
      cellWidth: 36,
      textHeight: 40,
      timeCellHeight: 28,
    },

    Empty: {
      colorText: "#bfbfbf",
      colorTextDescription: "#bfbfbf",
      margin: 0,
      marginXS: 8,
      marginXL: 16,
    },

    Typography: {
      colorText: "#262626",
      colorTextSecondary: "#595959",
      colorTextDescription: "#8c8c8c",
      colorTextDisabled: "#bfbfbf",
      colorLink: "#1890ff",
      colorLinkHover: "#40a9ff",
      colorLinkActive: "#096dd9",
      fontWeightStrong: 600,
      titleMarginBottom: "0.5em",
      titleMarginTop: "1.2em",
    },

    Collapse: {
      colorBgContainer: "#ffffff",
      colorBorder: "#d9d9d9",
      colorText: "#262626",
      colorTextHeading: "#262626",
      headerBg: "#fafafa",
      headerPadding: "12px 16px",
      contentBg: "#ffffff",
      contentPadding: "16px",
      borderRadiusLG: 8,
    },

    Skeleton: {
      color: "rgba(0, 0, 0, 0.06)",
      colorGradientEnd: "rgba(0, 0, 0, 0.15)",
      gradientFromColor: "rgba(0, 0, 0, 0.06)",
      gradientToColor: "rgba(0, 0, 0, 0.15)",
    },

    Statistic: {
      contentFontSize: 24,
      titleFontSize: 14,
    },

    Image: {
      colorBgMask: "rgba(0, 0, 0, 0.45)",
      previewOperationColor: "#ffffff",
      previewOperationColorDisabled: "rgba(255, 255, 255, 0.25)",
    },

    List: {
      colorBorder: "#f0f0f0",
      colorSplit: "#f0f0f0",
      colorText: "#262626",
      colorTextDescription: "#8c8c8c",
      itemPadding: "12px 0",
      itemPaddingSM: "8px 0",
      itemPaddingLG: "16px 24px",
    },
  },
};

// CSS Variables for global usage
export const cssVariables = {
  "--primary-color": "#1890ff",
  "--primary-hover": "#40a9ff",
  "--primary-active": "#096dd9",
  "--success-color": "#52c41a",
  "--warning-color": "#faad14",
  "--error-color": "#ff4d4f",
  "--text-color": "#262626",
  "--text-secondary": "#595959",
  "--text-tertiary": "#8c8c8c",
  "--bg-color": "#f5f7fa",
  "--bg-container": "#ffffff",
  "--border-color": "#e8e8e8",
  "--border-radius": "8px",
  "--border-radius-lg": "12px",
  "--shadow": "0 2px 8px rgba(0, 0, 0, 0.08)",
  "--shadow-lg": "0 4px 12px rgba(0, 0, 0, 0.12)",
  "--font-family":
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export default antdTheme;
