import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Как связаться с командой платформы ЗвукоЦвет: электронная почта и рекомендации по обращениям.",
};

export default function ContactsPage() {
  return (
    <div className="about-page">
      <Link href="/" className="about-back">
        ← На главную
      </Link>
      <h1 className="about-page-title">Контакты</h1>
      <p className="about-page-lead">
        По вопросам работы сайта, модерации, технических сбоев и сотрудничества вы можете написать нам на почту.
      </p>

      <section className="about-section" aria-labelledby="contacts-email-heading">
        <h2 id="contacts-email-heading">Электронная почта</h2>
        <p>
          Основной способ связи:{" "}
          <a className="contacts-mail-link" href="mailto:zvukozvet@gmail.com">
            zvukozvet@gmail.com
          </a>
        </p>
        <p>
          В теме письма укажите кратко суть обращения (например: «Вопрос по объявлению», «Техподдержка», «Предложение по
          сайту»), чтобы письмо было быстрее передано нужному ответственному.
        </p>
      </section>

      <section className="about-section" aria-labelledby="contacts-when-heading">
        <h2 id="contacts-when-heading">Когда писать</h2>
        <ul className="contacts-list">
          <li>не проходит модерация объявления или нужно уточнить причину отклонения;</li>
          <li>проблемы со входом, уведомлениями или отображением страниц;</li>
          <li>жалоба на нарушение правил другим пользователем (по возможности приложите ссылки и скриншоты);</li>
          <li>предложения по улучшению платформы или сотрудничество.</li>
        </ul>
        <p className="about-note">
          Ответ обычно приходит в течение нескольких рабочих дней. Срочные вопросы по уже опубликованным объявлениям
          опишите в начале письма — так их будет проще заметить в общем потоке.
        </p>
      </section>

      <section className="about-section" aria-labelledby="contacts-other-heading">
        <h2 id="contacts-other-heading">Дополнительно</h2>
        <p>
          Переписка по почте не заменяет общение автора объявления и исполнителя по самому заказу: договорённости по срокам,
          файлам и оплате закрепляйте между собой в удобном вам формате после принятия отклика на сайте.
        </p>
        <p>
          Ознакомиться с правилами и рекомендациями по объявлениям можно на странице{" "}
          <Link href="/about" className="contacts-mail-link">
            О нас
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
