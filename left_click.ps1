Add-Type @"
using System;
using System.Runtime.InteropServices;

public class MouseMover {
    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);
}
"@

# Defina as coordenadas para onde deseja mover o mouse
$x = 500  # Coordenada X
$y = 500  # Coordenada Y

# Mover o mouse para a posição desejada
[MouseMover]::SetCursorPos($x, $y)
