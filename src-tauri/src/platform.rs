#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Macos,
    Windows,
    Linux,
    Other,
}

pub fn classify_asset(name: &str) -> Platform {
    let n = name.to_ascii_lowercase();
    if is_windows(&n) {
        Platform::Windows
    } else if is_macos(&n) {
        Platform::Macos
    } else if is_linux(&n) {
        Platform::Linux
    } else {
        Platform::Other
    }
}

fn is_windows(n: &str) -> bool {
    n.contains("windows")
        || n.contains("win32")
        || n.contains("win64")
        || n.contains("win-")
        || n.contains("-win.")
        || n.contains("-pc-windows")
        || n.ends_with(".msi")
        || n.ends_with(".msix")
        || n.ends_with(".exe")
        || n.ends_with(".nupkg")
}

fn is_macos(n: &str) -> bool {
    n.contains("macos")
        || n.contains("darwin")
        || n.contains("osx")
        || n.contains("apple-darwin")
        || n.ends_with(".dmg")
        || n.ends_with(".pkg")
        || n.ends_with(".app")
}

fn is_linux(n: &str) -> bool {
    n.contains("linux")
        || n.contains("appimage")
        || n.contains("unknown-linux")
        || n.ends_with(".deb")
        || n.ends_with(".rpm")
        || n.ends_with(".appimage")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_common_release_assets() {
        assert_eq!(classify_asset("asterism_0.1.0_aarch64.dmg"), Platform::Macos);
        assert_eq!(classify_asset("app-macos-arm64.pkg"), Platform::Macos);
        assert_eq!(classify_asset("app-0.3.0-windows-x64.msi"), Platform::Windows);
        assert_eq!(classify_asset("app_0.1.0_x64-setup.exe"), Platform::Windows);
        assert_eq!(classify_asset("app-0.3.0-linux-amd64.AppImage"), Platform::Linux);
        assert_eq!(classify_asset("app_0.1.0_amd64.deb"), Platform::Linux);
        assert_eq!(classify_asset("source.tar.gz"), Platform::Other);
    }
}
