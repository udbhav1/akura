import Link from "next/link";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import logo from "../public/logo.svg"

const Navbar = () => {
  const { wallet } = useWallet();
  const location = useRouter().asPath;

  return (
    <nav className="navbar">
        <Link href="/">
            <div className="navbarLogo">
                {/* <h1>AKURA</h1> */}
                <img src="/logo.svg"/>
            </div>
        </Link>

        <div className="navbarLinks">
            <Link href="/funds">
                <a className={location == "/funds" ? "active" : ""}>BROWSE</a>
            </Link>
            <Link href="/create">
                <a className={location == "/create" ? "active" : ""}>CREATE</a>
            </Link>
            <Link href="/manage">
                <a className={location == "/manage" ? "active" : ""}>MANAGE</a>
            </Link>
        </div>

        <div className="navbarWallet">
            <WalletMultiButton className="navbarWalletButton"/>
        </div>

    </nav>
  );
};

export default Navbar;