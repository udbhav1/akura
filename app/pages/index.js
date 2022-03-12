import Head from 'next/head'
import styles from '../styles/Home.module.css'
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Akura</title>
        <meta name="description" content="Akura Protocol" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="landing">
        <h1><b>AKURA</b></h1>
        <p>Trustless asset management through index funds and ETFs</p>
        <Link href="/browse">
          <button>Launch App</button>
        </Link>
      </div>

      <footer className={styles.footer}>
      </footer>
    </div>
  )
}
