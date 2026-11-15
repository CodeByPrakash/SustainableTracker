package com.daycraft.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = DaycraftOrange,
    onPrimary = DaycraftSurface,
    primaryContainer = DaycraftOrangeSoft,
    onPrimaryContainer = DaycraftOrangeDark,
    secondary = DaycraftGreen,
    onSecondary = DaycraftSurface,
    background = DaycraftCanvas,
    onBackground = DaycraftInk,
    surface = DaycraftSurface,
    onSurface = DaycraftInk,
    outline = DaycraftLine
)

@Composable
fun DaycraftTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = DaycraftCanvas.toArgb()
            window.navigationBarColor = DaycraftCanvas.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = true
                isAppearanceLightNavigationBars = true
            }
        }
    }

    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = DaycraftTypography,
        content = content
    )
}
