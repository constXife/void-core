use std::env;
use std::os::unix::process::CommandExt;
use std::process::Command;

mod preview;

fn main() {
    match env::var("ATRIUM_HOST_MODE").ok().unwrap_or_default().trim() {
        "" => preview::run_preview(),
        "preview" => preview::run_preview(),
        "shim" => run_shim(),
        value => {
            eprintln!("atrium-host-rust: unsupported ATRIUM_HOST_MODE={value}");
            std::process::exit(2);
        }
    }
}

fn run_shim() {
    let downstream = env::var("ATRIUM_DOWNSTREAM_HOST_BIN")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| "void-atrium-web".to_string());

    let error = Command::new(&downstream).args(env::args().skip(1)).exec();
    eprintln!("atrium-host-rust: failed to exec {downstream}: {error}");
    std::process::exit(127);
}
