use super::{classify_asset, Platform};

#[test]
fn classifies_common_release_assets() {
    assert_eq!(
        classify_asset("asterism_0.1.0_aarch64.dmg"),
        Platform::Macos
    );
    assert_eq!(classify_asset("app-macos-arm64.pkg"), Platform::Macos);
    assert_eq!(
        classify_asset("app-0.3.0-windows-x64.msi"),
        Platform::Windows
    );
    assert_eq!(classify_asset("app_0.1.0_x64-setup.exe"), Platform::Windows);
    assert_eq!(
        classify_asset("app-0.3.0-linux-amd64.AppImage"),
        Platform::Linux
    );
    assert_eq!(classify_asset("app_0.1.0_amd64.deb"), Platform::Linux);
    assert_eq!(classify_asset("source.tar.gz"), Platform::Other);
}
